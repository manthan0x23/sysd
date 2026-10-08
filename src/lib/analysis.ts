import type { Edge } from "@xyflow/react";
import { TYPE_BY_ID, plansOf, type Plan } from "./catalog";
import { computeFits, type FitResult } from "./fit";
import { explicitPlan, isAuto, offeringOf, type StudioNode } from "./model";
import { estimate, type Estimate } from "./pricing/estimate";
import { simulate, type SimResult, type Workload } from "./sim";

export interface Analysis {
  sim: SimResult;
  fits: Record<string, FitResult>;
  /** Real-price estimates for managed services, by node id. */
  estimates: Record<string, Estimate | null>;
}

/** The plan a (non-server) node is on: its pick, or for auto the cheapest listed one. */
export function activePlan(n: StudioNode): Plan | undefined {
  const o = offeringOf(n.data);
  if (!o) return undefined;
  const picked = explicitPlan(n.data);
  if (picked) return picked;
  const plans = plansOf(o.id);
  if (!isAuto(n.data)) return plans[0];
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
      estimates[n.id] = o && o.model !== "self-hosted" ? estimate(o, activePlan(n), { rps: first.load[n.id] ?? 0, dataGb: w.dataGb, read: w.readPct / 100 }) : null;
    }
  }
  const sim = simulate(nodes, edges, w, { serverPrice, estimates });
  const result = { sim, fits, estimates };
  last = { nodes, edges, w, result };
  return result;
}
