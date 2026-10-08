import { TYPE_BY_ID } from "./catalog";
import { analyze } from "./analysis";
import { fromDoc, type DesignDoc } from "./doc";
import { offeringOf } from "./model";
import { SECONDS_PER_MONTH } from "./pricing/estimate";

export interface Row {
  id: string; name: string; service: string; provider: string; plan: string;
  reqPerSec: number; cost: number; share: number; perMillion: number | null; util: number | null; basis: string; host: boolean;
}

/** One row per component, from a saved design. Shared by every export so they agree with the screen. */
export function breakdown(doc: DesignDoc) {
  const { nodes, edges, workload } = fromDoc(doc);
  const a = analyze(nodes, edges, workload);
  const { sim } = a;
  const rows: Row[] = nodes.filter((n) => TYPE_BY_ID[n.data.typeId].role !== "source").map((n) => {
    const kind = TYPE_BY_ID[n.data.typeId];
    const o = offeringOf(n.data);
    const load = sim.load[n.id] ?? 0;
    const cost = sim.nodeCost[n.id] ?? 0;
    return {
      id: n.id, name: n.data.name || kind.short || kind.label, service: kind.label,
      provider: o ? (o.provider === "Self-hosted" ? o.product : o.provider) : "",
      plan: a.fits[n.id]?.plan?.label ?? "",
      reqPerSec: load, cost, share: sim.cost > 0 ? cost / sim.cost : 0,
      perMillion: load > 0 ? cost / ((load * SECONDS_PER_MONTH) / 1e6) : null,
      util: sim.util[n.id] ?? null,
      basis: sim.yours[n.id] ? "Your figure" : sim.priced[n.id] ? "Real price" : "Illustrative",
      host: kind.host != null,
    };
  });
  return { rows, sim, workload, nodes, edges };
}
