import type { Edge } from "@xyflow/react";
import { defaultOffering } from "./catalog";
import type { CustomPlan, StudioNode } from "./model";
import type { Workload } from "./sim";

/** The saved shape of a canvas. Versioned so older saves can be migrated later. */
export interface DesignDoc {
  version: 2;
  workload: Workload;
  nodes: {
    id: string; type: string; name?: string; icon?: string; offering?: string; plan?: string; custom?: CustomPlan;
    parent?: string; x: number; y: number; width?: number; height?: number;
  }[];
  edges: { id: string; from: string; to: string; weight?: number }[];
}

const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : undefined);

export function toDoc(nodes: StudioNode[], edges: Edge[], workload: Workload): DesignDoc {
  return {
    version: 2,
    workload,
    nodes: nodes.map((n) => ({
      id: n.id, type: n.data.typeId, name: n.data.name, icon: n.data.icon, offering: n.data.offeringId, plan: n.data.planId, custom: n.data.custom,
      parent: n.parentId, x: Math.round(n.position.x), y: Math.round(n.position.y),
      // Only blocks that can be resized keep a size; measured sizes of ordinary nodes are not part of the design.
      ...(n.data.typeId === "vps" || n.data.typeId === "container" ? { width: num(n.width) ?? num(n.style?.width), height: num(n.height) ?? num(n.style?.height) } : {}),
    })),
    edges: edges.map((e) => ({ id: e.id, from: e.source, to: e.target, weight: (e.data as { weight?: number } | undefined)?.weight })),
  };
}

export function fromDoc(doc: DesignDoc): { nodes: StudioNode[]; edges: Edge[]; workload: Workload } {
  const nodes: StudioNode[] = doc.nodes.map((n) => {
    const isHost = n.type === "vps" || n.type === "container";
    const node: StudioNode = {
      id: n.id, type: isHost ? "host" : "card", position: { x: n.x, y: n.y },
      data: { typeId: n.type, name: n.name, icon: n.icon, offeringId: n.offering ?? defaultOffering(n.type)?.id, planId: n.plan, custom: n.custom },
      ...(n.parent ? { parentId: n.parent } : {}),
    };
    if (isHost) { node.style = { width: n.width ?? (n.type === "vps" ? 520 : 300), height: n.height ?? (n.type === "vps" ? 320 : 190) }; node.zIndex = n.type === "vps" ? 0 : 1; }
    return node;
  });
  const edges: Edge[] = doc.edges.map((e) => ({ id: e.id, source: e.from, target: e.to, type: "flow", ...(e.weight != null ? { data: { weight: e.weight } } : {}) }));
  return { nodes, edges, workload: doc.workload };
}
