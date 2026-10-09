import type { Edge } from "@xyflow/react";
import { AUTO_PLAN_ID, TYPE_BY_ID, offeringLabel } from "@/lib/catalog";
import { analyze } from "@/lib/analysis";
import { offeringOf, type StudioNode } from "@/lib/model";
import { opsOf, type Workload } from "@/lib/sim";
import { rankOfferings } from "./panel/options";

/** Language and media models are chosen for quality, not price, so "best value" leaves them alone. */
const KEEP_TYPES = new Set(["llm", "embeddings", "speech", "vision", "inference", "mltrain"]);

export interface Switch { id: string; name: string; from: string; to: string }
export interface Optimized { nodes: StudioNode[]; switches: Switch[]; before: number; after: number }

/**
 * Moves every service to the cheapest option we have a real price for, at the load it carries now, with the tier
 * on Auto. A service is left alone when it has your own cost, runs inside a server block (its cost is the server's),
 * is a model, or has no cheaper priced option. Servers pick the cheapest provider and plan that fit what runs in them.
 */
export function optimizeForPrice(nodes: StudioNode[], edges: Edge[], w: Workload): Optimized {
  const a = analyze(nodes, edges, w);
  const switches: Switch[] = [];
  const next = nodes.map((n) => {
    const type = TYPE_BY_ID[n.data.typeId];
    if (!type || type.role === "source" || n.parentId || n.data.customCost || KEEP_TYPES.has(type.id)) return n;
    const load = a.sim.load[n.id] ?? 0;
    // Unconnected services are compared at an example load, as the inspector does.
    const rps = load > 0 ? load : type.cap != null && !type.host ? Math.max(1, (a.sim.entryRps || w.rps) * 0.1) : 0;
    const usage = { rps, dataGb: w.dataGb, read: w.readPct / 100, users: w.users, ops: opsOf(w), need: a.fits[n.id]?.need };
    const ranked = rankOfferings(n, usage);
    // Only prices we could size against the load compete; a bare "cheapest listed tier" is not a fair price.
    const best = ranked.find((r) => r.cost != null && !r.lowerBound);
    if (!best) return n;
    const current = ranked.find((r) => r.item.id === n.data.offeringId);
    if (current?.cost != null && !current.lowerBound && current.cost <= best.cost! + 0.01) return n.data.planId && n.data.planId !== AUTO_PLAN_ID && type.id !== "llm" ? { ...n, data: { ...n.data, planId: AUTO_PLAN_ID } } : n;
    if (best.item.id === n.data.offeringId) return n.data.planId === AUTO_PLAN_ID || !n.data.planId || type.id === "llm" ? n : { ...n, data: { ...n.data, planId: AUTO_PLAN_ID } };
    // Already as cheap as the best (within a cent): no point moving.
    if (current?.cost != null && current.cost <= best.cost! + 0.01) return n;
    const from = offeringOf(n.data);
    switches.push({ id: n.id, name: n.data.name || type.short || type.label, from: from ? offeringLabel(from) : type.label, to: offeringLabel(best.item) });
    return { ...n, data: { ...n.data, offeringId: best.item.id, planId: AUTO_PLAN_ID, custom: undefined } };
  });
  const after = switches.length || next.some((n, i) => n !== nodes[i]) ? analyze(next, edges, w).sim.cost : a.sim.cost;
  return { nodes: next, switches, before: a.sim.cost, after };
}
