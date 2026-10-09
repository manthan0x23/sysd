import type { Edge } from "@xyflow/react";
import { slug } from "../catalog/offerings";
import { fromDoc, toDoc, type DesignDoc } from "../doc";
import { formatNodes } from "../layout";
import { DEFAULT_OPS, type Workload } from "../sim";

type N = DesignDoc["nodes"][number];
type Extra = Partial<Pick<N, "parent" | "replicas" | "autoscale" | "hit" | "offering">>;

/** The offering id for a provider's product, the way the catalog builds it. */
export const off = (type: string, provider: string, product: string) => `${type}:${slug(provider)}:${slug(product)}`;

export const node = (id: string, type: string, name: string, extra: Extra = {}): N => ({ id, type, name, x: 0, y: 0, ...extra });

/** `[from, to]` pairs; an array on either side fans out. `weights` ("from>to": percent) sets how a node splits its traffic when the even split is wrong. */
export type Pair = [string | string[], string | string[]];
export const links = (pairs: Pair[], weights: Record<string, number> = {}): DesignDoc["edges"] =>
  pairs.flatMap(([a, b]) => (Array.isArray(a) ? a : [a]).flatMap((from) => (Array.isArray(b) ? b : [b]).map((to) => ({ id: `e-${from}-${to}`, from, to, ...(weights[`${from}>${to}`] != null ? { weight: weights[`${from}>${to}`] } : {}) }))));

export const traffic = (w: Pick<Workload, "users" | "dataGb" | "rps" | "peakRps" | "readPct">): Workload => ({ ...w, atPeak: false, ...DEFAULT_OPS });

/** A design laid out left to right on the canvas grid. */
export function laid(workload: Workload, nodes: N[], edges: DesignDoc["edges"]): DesignDoc {
  const base = fromDoc({ version: 2, workload, nodes, edges });
  return toDoc(formatNodes(base.nodes, base.edges as Edge[]), base.edges, base.workload);
}
