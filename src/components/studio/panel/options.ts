import { TYPE_BY_ID, offeringsOf, plansOf, type Offering, type Plan } from "@/lib/catalog";
import { AUTO_HEADROOM, autoPlan, worstRatio } from "@/lib/fit";
import { activePlan } from "@/lib/analysis";
import type { StudioNode } from "@/lib/model";
import { estimate, type Usage } from "@/lib/pricing/estimate";
import { tiers, TIER_LABEL, type Tier } from "@/lib/pricing/rank";
import { fmtMoney } from "@/lib/format";
import type { Need } from "@/lib/catalog";

export interface Ranked<T> { item: T; cost: number | null; tier: Tier; note?: string }

const haveOf = (p: Plan): Need => ({ cpu: p.spec?.vcpu ?? 0, ramGb: p.spec?.ramGb ?? 0, diskGb: p.spec?.diskGb ?? 0 });

/** Monthly cost of an offering at this usage, using its cheapest suitable plan. Null when we have no real prices. */
export function offeringCost(o: Offering, u: Usage): { cost: number | null; note?: string } {
  if (o.typeId === "vps") {
    if (!u.need) return { cost: null };
    const p = autoPlan(o.id, u.need);
    if (!p?.spec) return { cost: null, note: "plans not loaded yet" };
    if (worstRatio(u.need, haveOf(p)) > 1) return { cost: null, note: "largest loaded plan is too small" };
    return { cost: p.price ?? null, note: p.label };
  }
  if (o.typeId === "llm") {
    const costs = plansOf(o.id).map((p) => ({ p, c: estimate(o, p, u)?.monthly })).filter((x): x is { p: Plan; c: number } => x.c != null);
    if (!costs.length) return { cost: null };
    const best = costs.reduce((a, b) => (b.c < a.c ? b : a));
    return { cost: best.c, note: `${best.p.label}, the cheapest model` };
  }
  const e = estimate(o, undefined, u);
  return { cost: e ? e.monthly : null };
}

/** Every offering of a type, priced where we have real data and tiered against the cheapest. */
export function rankOfferings(node: StudioNode, u: Usage): Ranked<Offering>[] {
  const list = offeringsOf(node.data.typeId).map((o) => ({ o, ...offeringCost(o, u) }));
  const t = tiers(list.map((x) => x.cost));
  const ranked = list.map((x, i) => ({ item: x.o, cost: x.cost, tier: t[i], note: x.note }));
  // cheapest first, unpriced keep catalogue order at the end
  return [...ranked].sort((a, b) => (a.cost ?? Infinity) - (b.cost ?? Infinity));
}

export interface PlanRow { plan: Plan; cost: number | null; tier: Tier; fit?: "fits" | "tight" | "small" }

/** Plans of one offering: for servers, how well each fits; for models, what each costs. */
export function rankPlans(node: StudioNode, o: Offering, u: Usage): PlanRow[] {
  const plans = plansOf(o.id);
  if (o.typeId === "vps" && u.need) {
    return plans.map((plan) => {
      const r = worstRatio(u.need!, haveOf(plan));
      return { plan, cost: plan.price ?? null, tier: "unpriced" as Tier, fit: r > 1 ? "small" : r > AUTO_HEADROOM ? "tight" : "fits" };
    });
  }
  const costs = plans.map((p) => estimate(o, p, u)?.monthly ?? null);
  const t = tiers(costs);
  void node;
  return plans.map((plan, i) => ({ plan, cost: costs[i], tier: t[i] }));
}

export const tierBadge = (t: Tier) => (t === "unpriced" ? undefined : { label: TIER_LABEL[t], tone: t });
export const money = (n: number | null) => (n == null ? undefined : `${fmtMoney(n)}/mo`);

export { activePlan, TYPE_BY_ID };
