import { profileFor } from "@/lib/catalog/sizing";
import { TYPE_BY_ID, plansOf, type Need, type Plan } from "./catalog";
import { explicitPlan, isAuto, offeringOf, type StudioNode } from "./model";
import type { SimResult, Workload } from "./sim";

/** What the operating system, Docker daemon and agents take before your services get anything. */
export const HOST_OVERHEAD: Need = { cpu: 0.15, ramGb: 0.4, diskGb: 8 };
/** Auto picks the cheapest plan that stays at or under this share of every resource. */
export const AUTO_HEADROOM = 0.85;

export interface FitResult {
  /** What everything inside needs (including overhead on server blocks). */
  need: Need;
  /** What the chosen plan provides; undefined for containers and servers without a plan. */
  have?: Need;
  /** The plan in effect: the user's choice, or the one auto picked. */
  plan?: Plan;
  /** True when the plan was picked automatically. */
  auto: boolean;
  /** Worst of cpu/ram/disk used divided by available. */
  ratio: number | null;
  verdict: "fits" | "tight" | "over" | "open";
  over: string[];
  children: number;
}

const add = (a: Need, b: Need): Need => ({ cpu: a.cpu + b.cpu, ramGb: a.ramGb + b.ramGb, diskGb: a.diskGb + b.diskGb });
const ZERO: Need = { cpu: 0, ramGb: 0, diskGb: 0 };
const haveOf = (p: Plan): Need => ({ cpu: p.spec?.vcpu ?? 0, ramGb: p.spec?.ramGb ?? 0, diskGb: p.spec?.diskGb ?? 0 });
export const worstRatio = (need: Need, have: Need) => Math.max(need.cpu / have.cpu, need.ramGb / have.ramGb, need.diskGb / have.diskGb);

/** Cheapest listed plan that fits with headroom; the largest one if nothing does. */
export function autoPlan(offeringId: string, need: Need): Plan | undefined {
  const plans = plansOf(offeringId).filter((p) => p.spec).sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
  return plans.find((p) => worstRatio(need, haveOf(p)) <= AUTO_HEADROOM) ?? plans[plans.length - 1];
}

export function computeFits(nodes: StudioNode[], sim: SimResult, w: Workload): Record<string, FitResult> {
  const kids = new Map<string, StudioNode[]>();
  for (const n of nodes) if (n.parentId) kids.set(n.parentId, [...(kids.get(n.parentId) ?? []), n]);

  const needOfNode = (n: StudioNode): { need: Need; count: number } => {
    const type = TYPE_BY_ID[n.data.typeId];
    if (type.host) {
      let need = ZERO; let count = 0;
      for (const c of kids.get(n.id) ?? []) { const r = needOfNode(c); need = add(need, r.need); count += r.count; }
      return { need, count };
    }
    const profile = profileFor(type.hostable, offeringOf(n.data)?.product);
    if (!profile) return { need: ZERO, count: 1 };
    return { need: profile.run({ rps: sim.load[n.id] ?? 0, dataGb: w.dataGb, readPct: w.readPct }), count: 1 };
  };

  const out: Record<string, FitResult> = {};
  for (const n of nodes) {
    const type = TYPE_BY_ID[n.data.typeId];
    if (!type.host) continue;
    const inner = needOfNode(n);
    const isServer = type.host === "server";
    const need = isServer ? add(inner.need, HOST_OVERHEAD) : inner.need;
    const auto = isServer && isAuto(n.data);
    const offering = offeringOf(n.data);
    const plan = !isServer ? undefined : auto ? (offering ? autoPlan(offering.id, need) : undefined) : explicitPlan(n.data);
    if (!plan?.spec) { out[n.id] = { need, ratio: null, verdict: "open", over: [], children: inner.count, auto, plan }; continue; }
    const have = haveOf(plan);
    const r = { cpu: need.cpu / have.cpu, ram: need.ramGb / have.ramGb, disk: need.diskGb / have.diskGb };
    const ratio = Math.max(r.cpu, r.ram, r.disk);
    const over = [r.cpu > 1 && "CPU", r.ram > 1 && "RAM", r.disk > 1 && "disk"].filter(Boolean) as string[];
    out[n.id] = { need, have, plan, auto, ratio, verdict: over.length ? "over" : ratio > 0.8 ? "tight" : "fits", over, children: inner.count };
  }
  return out;
}
