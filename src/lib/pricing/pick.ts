import { OFFERING_BY_ID, TYPE_BY_ID, plansOf, type Need, type Plan } from "../catalog";
import { profileFor } from "../catalog/sizing";
import { AUTO_HEADROOM } from "../fit";
import type { OpsInputs } from "../sim";

export interface PickUsage { rps: number; dataGb: number; readPct: number; /** Monthly active users, for tiers limited by users. */ users?: number; /** Team and operations inputs. */ ops?: OpsInputs }

const SECONDS_PER_MONTH = 2_592_000;
const HOURS_PER_MONTH = 730;
/** Types whose stored data counts against a free tier's storage limit. */
const STORES_DATA = new Set(["db", "storage"]);

/**
 * Does a free tier cover this load? Every limit we know must hold, and at least one must have been compared:
 * a free tier with no stated limits is never assumed to be enough.
 */
/** Outbound GB a month for services that serve files (CDN, images, media, storage): requests times an average 100 KB object. */
const EGRESS_TYPES = new Set(["cdn", "images", "media", "object", "static"]);
const egressOf = (typeId: string | undefined, u: PickUsage) => (typeId && EGRESS_TYPES.has(typeId) ? (u.rps * SECONDS_PER_MONTH * 100) / 1e6 : undefined);

export function freeFits(p: Plan, u: PickUsage, role: string | undefined, need: Need | undefined, scalesToZero = false, typeId?: string): boolean {
  const L = p.limits;
  if (!p.free || !L) return false;
  let compared = 0;
  // Scale-to-zero compute only bills while active, so under about 10 requests/s it is assumed idle part of the time.
  const duty = scalesToZero ? Math.min(1, Math.max(0.1, u.rps / 10)) : 1;
  const test = (known: number | undefined, needed: number | undefined) => { if (known == null || needed == null) return true; compared++; return needed <= known; };
  return test(L.storageGb, role && STORES_DATA.has(role) ? u.dataGb : undefined)
    && test(L.requestsPerMonth, u.rps * SECONDS_PER_MONTH)
    && test(L.users, u.users)
    && test(L.seats, u.ops?.seats)
    && test(L.ciMinutes, u.ops?.ciMinutes)
    && test(L.monitors, u.ops?.monitors)
    && test(L.hosts, u.ops?.hosts)
    && test(L.ingestGb, u.ops?.ingestGb)
    && test(L.events, u.ops?.events)
    && test(L.egressGb, egressOf(typeId, u))
    && test(L.computeHours, need ? need.cpu * HOURS_PER_MONTH * duty : undefined)
    && test(L.ramGb, need?.ramGb)
    && test(L.vcpu, need?.cpu)
    && compared > 0;
}

/**
 * The tier "auto" lands on for a service with flat monthly tiers. Where the type has a sizing profile (databases,
 * caches, queues, search...), it is the cheapest priced tier whose CPU and RAM cover what the profile says this load
 * needs, with the same 85% headroom servers use; those profiles are rule-of-thumb (about +/-50%), so this is a
 * starting point, not a quote. Disk is only compared when the tiers list a disk size (managed instances usually bill
 * storage apart). Without a profile it is the cheapest priced tier. If nothing is big enough, the largest one.
 */
export function pickPlan(offeringId: string, typeId: string, u: PickUsage, product?: string): Plan | undefined {
  return pickPlanInfo(offeringId, typeId, u, product).plan;
}

/** As pickPlan, and whether the tier's size was actually compared with the load (false: it is only the cheapest listed tier). */
export function pickPlanInfo(offeringId: string, typeId: string, u: PickUsage, product?: string): { plan?: Plan; sized: boolean } {
  const all = plansOf(offeringId);
  const seats = Math.max(1, Math.round(u.ops?.seats ?? 1));
  const eff = (p: Plan) => p.price! * (p.perSeat ? seats : 1);
  const priced = all.filter((p) => p.price != null && p.price > 0).sort((a, b) => eff(a) - eff(b));
  const profile = profileFor(TYPE_BY_ID[typeId]?.hostable, product);
  const need = profile?.run({ rps: u.rps, dataGb: u.dataGb, readPct: u.readPct });
  // A free tier wins whenever its stated limits cover the load.
  const free = all.find((p) => freeFits(p, u, TYPE_BY_ID[typeId]?.role, need, OFFERING_BY_ID[offeringId]?.model === "serverless", typeId));
  if (free) return { plan: free, sized: true };
  if (!priced.length) return { sized: false };
  const sized = priced.filter((p) => p.spec);
  if (!profile || !need || !sized.length) return { plan: priced[0], sized: false };
  const hasDisk = sized.some((p) => p.spec!.diskGb > 0);
  const want = { ...need, diskGb: hasDisk ? need.diskGb : 0 };
  const have = (p: Plan) => ({ cpu: p.spec!.vcpu, ramGb: p.spec!.ramGb, diskGb: p.spec!.diskGb });
  // Only resources that are needed count (0 / 0 would be NaN and never fit).
  const ratio = (p: Plan) => Math.max(...([["cpu"], ["ramGb"], ["diskGb"]] as const).map(([k]) => (want[k] > 0 ? want[k] / have(p)[k] : 0)));
  const fits = sized.find((p) => ratio(p) <= AUTO_HEADROOM);
  return { plan: fits ?? sized[sized.length - 1], sized: Boolean(fits) };
}
