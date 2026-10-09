import type { Edge } from "@xyflow/react";
import { TYPE_BY_ID, plansOf, type Plan } from "./catalog";
import { computeFits, type FitResult } from "./fit";
import { explicitPlan, isAuto, offeringOf, type StudioNode } from "./model";
import { estimate, type Estimate } from "./pricing/estimate";
import { pickPlan, type PickUsage } from "./pricing/pick";
import { opsOf, simulate, type SimResult, type Workload } from "./sim";

export interface Analysis {
  sim: SimResult;
  fits: Record<string, FitResult>;
  /** Real-price estimates for managed services, by node id. */
  estimates: Record<string, Estimate | null>;
}

/** The plan a (non-server) node is on: its pick, or for auto the cheapest listed one. */
export function activePlan(n: StudioNode, usage: PickUsage = { rps: 0, dataGb: 0, readPct: 90 }): Plan | undefined {
  const o = offeringOf(n.data);
  if (!o) return undefined;
  const picked = explicitPlan(n.data);
  if (picked) return picked;
  const plans = plansOf(o.id);
  if (!isAuto(n.data)) return plans[0];
  // Language models: Auto is the cheapest model. Everything else: the tier whose limits and size cover the load, or
  // none (never a plan the load would overflow, such as a free tier).
  if (n.data.typeId !== "llm") return pickPlan(o.id, n.data.typeId, usage, o.product);
  const unit = (p: Plan) => p.price ?? (p.tokens ? p.tokens.inPerM + p.tokens.outPerM : 0);
  return [...plans].sort((a, b) => unit(a) - unit(b))[0];
}

let last: { nodes: StudioNode[]; edges: Edge[]; w: Workload; result: Analysis } | null = null;

/**
 * Two passes. Pass one finds how much traffic reaches each component. Those loads size server plans
 * (auto picks the cheapest that fits) and price managed services. Pass two then totals the cost.
 * Cached on identity so the canvas and the panel share one computation.
 */
export function analyze(nodes: StudioNode[], edges: Edge[], w: Workload): Analysis {
  if (last && last.nodes === nodes && last.edges === edges && last.w === w) return last.result;
  const first = simulate(nodes, edges, w);
  const fits = computeFits(nodes, first, w);

  const serverPrice: Record<string, number | undefined> = {};
  const estimates: Record<string, Estimate | null> = {};
  for (const n of nodes) {
    const type = TYPE_BY_ID[n.data.typeId];
    if (type.host === "server") serverPrice[n.id] = fits[n.id]?.plan?.price;
    else if (!type.host && type.cap != null) {
      const o = offeringOf(n.data);
      estimates[n.id] = o && o.model !== "self-hosted" ? estimate(o, activePlan(n, { rps: first.load[n.id] ?? 0, dataGb: w.dataGb, readPct: w.readPct, users: w.users, ops: opsOf(w) }), { rps: first.load[n.id] ?? 0, dataGb: w.dataGb, read: w.readPct / 100, users: w.users, ops: opsOf(w) }) : null;
    }
  }
  const sim = simulate(nodes, edges, w, { serverPrice, estimates });
  const result = { sim, fits, estimates };
  last = { nodes, edges, w, result };
  return result;
}
