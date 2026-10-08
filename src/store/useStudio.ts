import { create } from "zustand";
import {
  addEdge, applyEdgeChanges, applyNodeChanges,
  type Connection, type Edge, type OnConnect, type OnEdgesChange, type OnNodesChange,
} from "@xyflow/react";
import { AUTO_PLAN_ID, TYPE_BY_ID, defaultOffering, offeringsOf, plansOf, selfHostedOf } from "@/lib/catalog";
import { DEFAULT_CUSTOM, type CustomPlan, type NodeData, type StudioNode } from "@/lib/model";
import { DEFAULT_WORKLOAD, type Workload } from "@/lib/sim";

export type Mode = "design" | "learn";
export type View = "overview" | "inputs" | "traffic" | "load" | "cost" | "fit";

/** Servers start on Auto (cheapest tier that fits); models start on the first listed one; the rest have no tiers. */
export function defaultPlanId(typeId: string, offeringId: string | undefined): string | undefined {
  if (TYPE_BY_ID[typeId].host === "server") return AUTO_PLAN_ID;
  return offeringId ? plansOf(offeringId)[0]?.id : undefined;
}
export type { StudioNode };

const COL = 186;
const HOST_SIZE = { server: { width: 520, height: 320 }, container: { width: 300, height: 190 } };

/** Parents must come before their children in the array React Flow receives. */
function orderNodes(nodes: StudioNode[]): StudioNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const depth = (n: StudioNode): number => (n.parentId && byId.has(n.parentId) ? 1 + depth(byId.get(n.parentId)!) : 0);
  return [...nodes].sort((a, b) => depth(a) - depth(b));
}

export function makeNode(id: string, typeId: string, position: { x: number; y: number }, parentId?: string): StudioNode {
  const type = TYPE_BY_ID[typeId];
  const offering = (parentId && selfHostedOf(typeId)) || defaultOffering(typeId);
  const data: NodeData = { typeId, offeringId: offering?.id, planId: defaultPlanId(typeId, offering?.id) };
  const node: StudioNode = { id, type: type.host ? "host" : "card", position, data, ...(parentId ? { parentId } : {}) };
  if (type.host) { node.style = { ...HOST_SIZE[type.host] }; node.zIndex = type.host === "server" ? 0 : 1; }
  return node;
}

const seed = (id: string, typeId: string, col: number, y: number) => makeNode(id, typeId, { x: col * COL, y });
const INITIAL_NODES: StudioNode[] = [
  seed("client", "client", 0, 170),
  seed("cdn", "cdn", 1, 40), seed("lb", "lb", 1, 170),
  seed("s3", "object", 2, 40), seed("api", "fn", 2, 170),
  seed("cache", "redis", 3, 40), seed("db", "postgres", 3, 170), seed("queue", "queue", 3, 300),
  seed("worker", "worker", 4, 300),
];
const link = (s: string, t: string): Edge => ({ id: `e-${s}-${t}`, source: s, target: t, type: "flow" });
const INITIAL_EDGES: Edge[] = [
  link("client", "cdn"), link("client", "lb"), link("cdn", "s3"), link("lb", "api"),
  link("api", "cache"), link("api", "db"), link("api", "queue"), link("queue", "worker"),
];

interface Studio {
  nodes: StudioNode[];
  edges: Edge[];
  workload: Workload;
  mode: Mode;
  selectedId: string | null;
  selectedEdgeId: string | null;
  view: View;
  onNodesChange: OnNodesChange<StudioNode>;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addNode: (typeId: string, position: { x: number; y: number }, parentId?: string) => void;
  reparent: (id: string, parentId: string | null, position: { x: number; y: number }) => void;
  rename: (id: string, name: string) => void;
  setIcon: (id: string, icon: string | undefined) => void;
  setOffering: (id: string, offeringId: string) => void;
  setPlan: (id: string, planId: string) => void;
  setCustom: (id: string, patch: Partial<CustomPlan>) => void;
  setWorkload: (patch: Partial<Workload>) => void;
  setMode: (m: Mode) => void;
  select: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  setEdgeWeight: (id: string, weight: number | undefined) => void;
  setView: (v: View) => void;
  reset: () => void;
}

let counter = 0;
const patchData = (nodes: StudioNode[], id: string, patch: Partial<NodeData>) =>
  nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n));

export const useStudio = create<Studio>((set) => ({
  nodes: INITIAL_NODES,
  edges: INITIAL_EDGES,
  workload: DEFAULT_WORKLOAD,
  mode: "learn",
  selectedId: "db",
  selectedEdgeId: null,
  view: "overview",
  onNodesChange: (changes) => set((s) => ({ nodes: applyNodeChanges(changes, s.nodes) })),
  onEdgesChange: (changes) => set((s) => ({ edges: applyEdgeChanges(changes, s.edges) })),
  onConnect: (c: Connection) => set((s) => ({ edges: addEdge({ ...c, type: "flow" }, s.edges) })),
  addNode: (typeId, position, parentId) =>
    set((s) => {
      const id = `${typeId}-${Date.now().toString(36)}-${counter++}`;
      return { nodes: orderNodes([...s.nodes, makeNode(id, typeId, position, parentId)]), selectedId: id, selectedEdgeId: null };
    }),
  reparent: (id, parentId, position) =>
    set((s) => ({
      nodes: orderNodes(
        s.nodes.map((n) => {
          if (n.id !== id) return n;
          const type = TYPE_BY_ID[n.data.typeId];
          const current = n.data.offeringId;
          let offeringId = current;
          if (!type.host) {
            const selfHosted = selfHostedOf(n.data.typeId);
            if (parentId && selfHosted) offeringId = selfHosted.id;
            // Leaving a server: fall back to the first managed offering so the node is not "self-hosted nowhere".
            if (!parentId && current && selfHosted?.id === current) offeringId = (offeringsOf(n.data.typeId).find((o) => o.model !== "self-hosted") ?? selfHosted).id;
          }
          const { parentId: _old, ...rest } = n;
          void _old;
          return { ...rest, ...(parentId ? { parentId } : {}), position, data: { ...n.data, offeringId } };
        }),
      ),
    })),
  setIcon: (id, icon) => set((s) => ({ nodes: patchData(s.nodes, id, { icon }) })),
  rename: (id, name) => set((s) => ({ nodes: patchData(s.nodes, id, { name: name.trim().slice(0, 40) || undefined }) })),
  setOffering: (id, offeringId) =>
    set((s) => {
      const typeId = s.nodes.find((n) => n.id === id)?.data.typeId;
      return { nodes: patchData(s.nodes, id, { offeringId, planId: typeId ? defaultPlanId(typeId, offeringId) : undefined }) };
    }),
  setPlan: (id, planId) => set((s) => ({ nodes: patchData(s.nodes, id, { planId }) })),
  setCustom: (id, patch) =>
    set((s) => ({ nodes: s.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, custom: { ...(n.data.custom ?? DEFAULT_CUSTOM), ...patch } } } : n)) })),
  setWorkload: (patch) => set((s) => ({ workload: { ...s.workload, ...patch } })),
  setMode: (mode) => set({ mode }),
  select: (selectedId) => set({ selectedId, selectedEdgeId: null }),
  selectEdge: (selectedEdgeId) => set({ selectedEdgeId, selectedId: null }),
  setEdgeWeight: (id, weight) =>
    set((s) => ({ edges: s.edges.map((e) => (e.id === id ? { ...e, data: { ...(e.data ?? {}), weight } } : e)) })),
  setView: (view) => set({ view }),
  reset: () => set({ nodes: INITIAL_NODES, edges: INITIAL_EDGES, selectedId: "db", selectedEdgeId: null, view: "overview", workload: DEFAULT_WORKLOAD }),
}));
