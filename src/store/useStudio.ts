import { create } from "zustand";
import {
  addEdge, applyEdgeChanges, applyNodeChanges,
  type Connection, type Edge, type OnConnect, type OnEdgesChange, type OnNodesChange,
} from "@xyflow/react";
import { AUTO_PLAN_ID, TYPE_BY_ID, checkLink, defaultOffering, offeringsOf, plansOf, selfHostedOf } from "@/lib/catalog";
import { DEFAULT_CUSTOM, MAX_REPLICAS, type CustomCost, type CustomPlan, type NodeData, type StudioNode } from "@/lib/model";
import { fromDoc, type DesignDoc } from "@/lib/doc";
import { DEFAULT_WORKLOAD, type Workload } from "@/lib/sim";
import { PASTE_STEP, alignNodes, cloneClip, clipOf, distributeNodes, nudgeNodes, type AlignMode, type Clip, type DistributeAxis } from "@/lib/selection";
import type { TraceKind } from "@/lib/trace";

export type Mode = "design" | "learn";
export type Status = "draft" | "saved";
export type Level = "owner" | "edit" | "view";
export type Sync = "idle" | "saving" | "saved" | "error" | "conflict";

/** Where the canvas came from and how it is doing against the database. id null = not saved anywhere yet. */
export interface DesignState {
  id: string | null;
  title: string;
  status: Status;
  rev: number;
  teamId: string | null;
  level: Level | null;
  /** True on a public share page: read-only, and nothing about it is saved. */
  shared: boolean;
  sync: Sync;
  error: string | null;
  /** JSON of the document as last saved, to tell real edits from layout noise. */
  lastJson: string;
  /** Title or status changed since the last save. */
  metaDirty: boolean;
  /** Changes with each hydrate so the page knows the right design is on screen. */
  key: string | null;
}

export interface InitialDesign { id: string | null; title: string; status: Status; rev: number; teamId: string | null; level: Level | null; shared?: boolean; doc: DesignDoc | null }

const NEW_DESIGN: DesignState = { id: null, title: "Untitled design", status: "draft", rev: 0, teamId: null, level: null, shared: false, sync: "idle", error: null, lastJson: "", metaDirty: false, key: null };
export interface ReqState { kind: TraceKind; /** A client link to start on; absent = the default entry. */ entry?: string; step: number; playing: boolean; speed: number }
/** One step lit on the canvas: the link a dot travels (and which way), the nodes working, and the links already walked. */
export interface ReqFocus { key: number; edgeId?: string; reverse?: boolean; nodes: string[]; walked: string[]; ms: number }
export type View = "overview" | "inputs" | "traffic" | "load" | "cost" | "fit";

/** Servers start on Auto (cheapest tier that fits); models start on the first listed one; the rest have no tiers. */
export function defaultPlanId(typeId: string, offeringId: string | undefined): string | undefined {
  if (TYPE_BY_ID[typeId].host === "server") return AUTO_PLAN_ID;
  // Language models start on the first listed model; other tiered services start on Auto (the tier that fits the load).
  return typeId === "llm" && offeringId ? plansOf(offeringId)[0]?.id : AUTO_PLAN_ID;
}
export type { StudioNode };
import { formatNodes } from "@/lib/layout";

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
  link("client", "cdn"), link("client", "lb"),
  // A CDN answers most requests itself (its hit rate, 95% by default), so only a small share reaches storage.
  link("cdn", "s3"), link("lb", "api"),
  link("api", "cache"), link("api", "db"), link("api", "queue"), link("queue", "worker"),
];

interface Studio {
  nodes: StudioNode[];
  edges: Edge[];
  workload: Workload;
  mode: Mode;
  selectedId: string | null;
  selectedEdgeId: string | null;
  /** Two or more nodes picked at once (marquee, shift-click, select all). selectedId is null while this is set. */
  multi: string[];
  /** What a drag on empty canvas does: draw a selection box, or pan the view. */
  tool: "select" | "pan";
  setTool: (t: "select" | "pan") => void;
  /** React Flow's own selection changes (marquee, shift-click), folded into selectedId / multi. */
  applySelect: (changes: { id: string; selected: boolean }[]) => void;
  selectAll: () => void;
  selectMany: (ids: string[]) => void;
  copySelection: () => boolean;
  paste: () => void;
  duplicateSelection: () => void;
  removeSelection: () => void;
  alignSelection: (mode: AlignMode) => void;
  distributeSelection: (axis: DistributeAxis) => void;
  nudgeSelection: (dx: number, dy: number) => void;
  /** How many steps Undo and Redo can go (see startHistory). */
  histLen: { past: number; future: number };
  /** Puts a ready-made design on the (empty) canvas, keeping the design's identity and replacing its name. */
  applyDoc: (doc: DesignDoc, title: string) => void;
  /** The request simulator: which kind of request, and where in its journey. Null when closed. */
  req: ReqState | null;
  setReq: (patch: Partial<ReqState> | null) => void;
  /** What the simulator is showing right now, so the canvas can light it up. */
  reqFocus: ReqFocus | null;
  setReqFocus: (f: ReqFocus | null) => void;
  view: View;
  /** Whether the cost and traffic breakdown table is open. */
  dockOpen: boolean;
  dockFull: boolean;
  setDockFull: (v: boolean) => void;
  setDock: (open: boolean) => void;
  /** Which surfaces are open. Each one can fold into a single icon island. */
  ui: { left: boolean; right: boolean; util: boolean };
  setUi: (key: "left" | "right" | "util", open: boolean) => void;
  /** Replaces an empty or edited canvas with the sample system. */
  loadSample: () => void;
  design: DesignState;
  hydrate: (key: string, d: InitialDesign | null) => void;
  setTitle: (t: string) => void;
  setStatus: (s: Status) => void;
  setSync: (sync: Sync, error?: string | null) => void;
  markSaved: (p: { id?: string; rev: number; json: string; status?: Status }) => void;
  onNodesChange: OnNodesChange<StudioNode>;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addNode: (typeId: string, position: { x: number; y: number }, parentId?: string) => string;
  reparent: (id: string, parentId: string | null, position: { x: number; y: number }) => void;
  rename: (id: string, name: string) => void;
  setCustomCost: (id: string, cost: CustomCost | undefined) => void;
  /** Removes nodes (and anything inside them, and their links) and remembers them for Undo. */
  removeNodes: (ids: string[]) => void;
  removeEdges: (ids: string[]) => void;
  /** What was just deleted, so a toast can offer to bring it back. */
  deleted: { label: string; nodes: StudioNode[]; edges: Edge[]; at: number } | null;
  rememberDeleted: (label: string, nodes: StudioNode[], edges: Edge[]) => void;
  undoDelete: () => void;
  dismissDeleted: () => void;
  /** Copies of a service (a database with 3 is a primary plus 2 read replicas). */
  setReplicas: (id: string, n: number) => void;
  /** Compute only: let the number of copies follow the load between min and max. Undefined turns it off. */
  setAutoscale: (id: string, cfg: { min: number; max: number } | undefined) => void;
  /** How often a cache or CDN answers without going further (0-100). */
  setHitRate: (id: string, pct: number | undefined) => void;
  /** The design before "Best value" ran, so the toast can undo it. */
  optimized: { before: StudioNode[]; text: string; at: number } | null;
  applyOptimized: (nodes: StudioNode[], before: StudioNode[], text: string) => void;
  undoOptimized: () => void;
  dismissOptimized: () => void;
  /** A short message about a refused link, shown as a toast. */
  linkNotice: { text: string; at: number } | null;
  setLinkNotice: (text: string | null) => void;
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
  /** Re-positions every node on an even, axis-aligned grid (src/lib/layout.ts). */
  formatLayout: () => void;
  reset: () => void;
}

let counter = 0;
const patchData = (nodes: StudioNode[], id: string, patch: Partial<NodeData>) =>
  nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n));

type StudioState = Studio;
/** What the selection currently is: the group if there is one, else the single node. */
const selectedIds = (s: Pick<StudioState, "multi" | "selectedId">) => (s.multi.length ? s.multi : s.selectedId ? [s.selectedId] : []);

/** Copied nodes wait here (not on the system clipboard); each paste lands a little further along. */
let clipboard: { clip: Clip; pastes: number } | null = null;

/** Adds fresh copies of a clip to the canvas and selects them. */
function addCopies(s: StudioState, clip: Clip, offset: number): Partial<StudioState> {
  const made = cloneClip(clip, s.nodes, offset, offset);
  if (!made.nodes.length) return {};
  const tops = made.nodes.filter((n) => !n.parentId || !made.nodes.some((m) => m.id === n.parentId)).map((n) => n.id);
  return {
    nodes: orderNodes([...s.nodes, ...made.nodes]), edges: [...s.edges, ...made.edges],
    ...(tops.length >= 2 ? { multi: tops, selectedId: null } : { multi: [], selectedId: tops[0] ?? null }), selectedEdgeId: null,
  };
}

export const useStudio = create<Studio>((set, get) => ({
  nodes: INITIAL_NODES,
  edges: INITIAL_EDGES,
  workload: DEFAULT_WORKLOAD,
  mode: "learn",
  selectedId: "db",
  selectedEdgeId: null,
  multi: [],
  tool: "select",
  setTool: (tool) => set({ tool }),
  applySelect: (changes) => set((s) => {
    const cur = new Set<string>([...s.multi, ...(s.selectedId ? [s.selectedId] : [])]);
    for (const c of changes) { if (c.selected) cur.add(c.id); else cur.delete(c.id); }
    const ids = [...cur].filter((id) => s.nodes.some((n) => n.id === id));
    const now = selectedIds(s);
    if (ids.length === now.length && ids.every((id) => now.includes(id))) return {};
    return ids.length >= 2 ? { multi: ids, selectedId: null, selectedEdgeId: null } : { multi: [], selectedId: ids[0] ?? null, ...(ids.length ? { selectedEdgeId: null } : {}) };
  }),
  selectAll: () => set((s) => {
    const ids = s.nodes.map((n) => n.id);
    return ids.length >= 2 ? { multi: ids, selectedId: null, selectedEdgeId: null } : { multi: [], selectedId: ids[0] ?? null };
  }),
  selectMany: (ids) => set(() => (ids.length >= 2 ? { multi: ids, selectedId: null, selectedEdgeId: null } : { multi: [], selectedId: ids[0] ?? null, selectedEdgeId: null })),
  copySelection: () => {
    const s = get();
    const ids = selectedIds(s);
    if (!ids.length) return false;
    clipboard = { clip: clipOf(s.nodes, s.edges, ids), pastes: 0 };
    return true;
  },
  paste: () => set((s) => {
    if (!clipboard) return {};
    clipboard.pastes++;
    return addCopies(s, clipboard.clip, PASTE_STEP * clipboard.pastes);
  }),
  duplicateSelection: () => set((s) => {
    const ids = selectedIds(s);
    return ids.length ? addCopies(s, clipOf(s.nodes, s.edges, ids), PASTE_STEP) : {};
  }),
  removeSelection: () => { const ids = selectedIds(get()); if (ids.length) get().removeNodes(ids); },
  alignSelection: (mode) => set((s) => ({ nodes: alignNodes(s.nodes, selectedIds(s), mode) })),
  distributeSelection: (axis) => set((s) => ({ nodes: distributeNodes(s.nodes, selectedIds(s), axis) })),
  nudgeSelection: (dx, dy) => set((s) => ({ nodes: nudgeNodes(s.nodes, selectedIds(s), dx, dy) })),
  histLen: { past: 0, future: 0 },
  applyDoc: (doc, title) => set((s) => {
    const body = fromDoc(doc);
    return { nodes: orderNodes(body.nodes), edges: body.edges, workload: body.workload, multi: [], selectedId: null, selectedEdgeId: null, view: "overview", req: null, reqFocus: null, design: { ...s.design, title, metaDirty: true } };
  }),
  req: null,
  setReq: (patch) => set((s) => (patch === null ? { req: null, reqFocus: null } : { req: { ...(s.req ?? { kind: "read-miss" as TraceKind, step: 0, playing: false, speed: 1 }), ...patch } })),
  reqFocus: null,
  setReqFocus: (reqFocus) => set({ reqFocus }),
  view: "overview",
  dockOpen: false,
  dockFull: false,
  setDockFull: (dockFull) => set({ dockFull }),
  setDock: (dockOpen) => set({ dockOpen }),
  ui: { left: true, right: true, util: true },
  setUi: (key, open) => set((s) => ({ ui: { ...s.ui, [key]: open } })),
  loadSample: () => set({ nodes: INITIAL_NODES, edges: INITIAL_EDGES, multi: [], req: null, reqFocus: null, selectedId: "db", selectedEdgeId: null, view: "overview", workload: DEFAULT_WORKLOAD }),
  design: NEW_DESIGN,
  hydrate: (key, d) =>
    set(() => {
      if (!d) return { nodes: INITIAL_NODES, edges: INITIAL_EDGES, workload: DEFAULT_WORKLOAD, multi: [], req: null, reqFocus: null, selectedId: "db", selectedEdgeId: null, view: "overview", design: { ...NEW_DESIGN, key } };
      const body = d.doc ? fromDoc(d.doc) : { nodes: INITIAL_NODES, edges: INITIAL_EDGES, workload: DEFAULT_WORKLOAD };
      return {
        nodes: orderNodes(body.nodes), edges: body.edges, workload: body.workload, multi: [], req: null, reqFocus: null, selectedId: null, selectedEdgeId: null, view: "overview",
        design: { id: d.id, title: d.title, status: d.status, rev: d.rev, teamId: d.teamId, level: d.level, shared: Boolean(d.shared), sync: "idle", error: null, lastJson: d.doc ? JSON.stringify(d.doc) : "", metaDirty: false, key },
      };
    }),
  setTitle: (title) => set((s) => ({ design: { ...s.design, title, metaDirty: true } })),
  setStatus: (status) => set((s) => ({ design: { ...s.design, status, metaDirty: true } })),
  setSync: (sync, error = null) => set((s) => ({ design: { ...s.design, sync, error } })),
  markSaved: ({ id, rev, json, status }) => set((s) => ({ design: { ...s.design, id: id ?? s.design.id, rev, lastJson: json, status: status ?? s.design.status, metaDirty: false, sync: "saved", error: null, level: s.design.level ?? "owner" } })),
  onNodesChange: (changes) => set((s) => ({ nodes: applyNodeChanges(changes, s.nodes) })),
  onEdgesChange: (changes) => set((s) => ({ edges: applyEdgeChanges(changes, s.edges) })),
  onConnect: (c: Connection) => set((s) => {
    // The canvas already refuses invalid drops; this guards every other caller too.
    const from = s.nodes.find((n) => n.id === c.source), to = s.nodes.find((n) => n.id === c.target);
    if (!from || !to || c.source === c.target) return {};
    const check = checkLink(from.data.typeId, to.data.typeId);
    if (!check.ok) return { linkNotice: { text: check.reason, at: Date.now() } };
    if (s.edges.some((e) => e.source === c.source && e.target === c.target)) return { linkNotice: { text: "Those two are already linked.", at: Date.now() } };
    return { edges: addEdge({ ...c, type: "flow" }, s.edges) };
  }),
  addNode: (typeId, position, parentId) => {
    const id = `${typeId}-${Date.now().toString(36)}-${counter++}`;
    set((s) => ({ nodes: orderNodes([...s.nodes, makeNode(id, typeId, position, parentId)]), selectedId: id, selectedEdgeId: null, multi: [] }));
    return id;
  },
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
  setReplicas: (id, n) => set((s) => ({ nodes: patchData(s.nodes, id, { replicas: Math.min(MAX_REPLICAS, Math.max(1, Math.round(n) || 1)) }) })),
  setAutoscale: (id, cfg) => set((s) => ({
    nodes: patchData(s.nodes, id, { autoscale: cfg && { min: Math.min(MAX_REPLICAS, Math.max(1, Math.round(cfg.min) || 1)), max: Math.min(MAX_REPLICAS, Math.max(Math.round(cfg.min) || 1, Math.round(cfg.max) || 1)) } }),
  })),
  setHitRate: (id, pct) => set((s) => ({ nodes: patchData(s.nodes, id, { hitRate: pct == null ? undefined : Math.min(100, Math.max(0, Math.round(pct))) }) })),
  optimized: null,
  applyOptimized: (nodes, before, text) => set({ nodes, optimized: { before, text, at: Date.now() } }),
  undoOptimized: () => set((s) => (s.optimized ? { nodes: s.optimized.before, optimized: null } : {})),
  dismissOptimized: () => set({ optimized: null }),
  linkNotice: null,
  setLinkNotice: (text) => set({ linkNotice: text ? { text, at: Date.now() } : null }),
  setIcon: (id, icon) => set((s) => ({ nodes: patchData(s.nodes, id, { icon }) })),
  setCustomCost: (id, customCost) => set((s) => ({ nodes: patchData(s.nodes, id, { customCost }) })),
  deleted: null,
  rememberDeleted: (label, nodes, edges) => set({ deleted: { label, nodes, edges, at: Date.now() } }),
  dismissDeleted: () => set({ deleted: null }),
  undoDelete: () => set((s) => {
    if (!s.deleted) return {};
    const have = new Set(s.nodes.map((n) => n.id));
    const haveE = new Set(s.edges.map((e) => e.id));
    const nodes = orderNodes([...s.nodes, ...s.deleted.nodes.filter((n) => !have.has(n.id))]);
    const ids = new Set(nodes.map((n) => n.id));
    // a restored link needs both ends to exist
    const edges = [...s.edges, ...s.deleted.edges.filter((e) => !haveE.has(e.id) && ids.has(e.source) && ids.has(e.target))];
    return { nodes, edges, deleted: null };
  }),
  removeNodes: (ids) => set((s) => {
    const gone = new Set(ids);
    let grew = true;
    while (grew) { grew = false; for (const n of s.nodes) if (n.parentId && gone.has(n.parentId) && !gone.has(n.id)) { gone.add(n.id); grew = true; } }
    const nodes = s.nodes.filter((n) => !gone.has(n.id));
    const removedNodes = s.nodes.filter((n) => gone.has(n.id));
    const removedEdges = s.edges.filter((e) => gone.has(e.source) || gone.has(e.target));
    if (!removedNodes.length) return {};
    const first = removedNodes[0];
    const label = removedNodes.length > 1 ? `${removedNodes.length} services` : (first.data.name || TYPE_BY_ID[first.data.typeId].short || TYPE_BY_ID[first.data.typeId].label);
    return {
      nodes, edges: s.edges.filter((e) => !removedEdges.includes(e)),
      selectedId: s.selectedId && gone.has(s.selectedId) ? null : s.selectedId, selectedEdgeId: null, multi: s.multi.filter((id) => !gone.has(id)),
      deleted: { label, nodes: removedNodes, edges: removedEdges, at: Date.now() },
    };
  }),
  removeEdges: (ids) => set((s) => {
    const gone = new Set(ids);
    const removed = s.edges.filter((e) => gone.has(e.id));
    if (!removed.length) return {};
    return { edges: s.edges.filter((e) => !gone.has(e.id)), selectedEdgeId: null, deleted: { label: "link", nodes: [], edges: removed, at: Date.now() } };
  }),
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
  select: (selectedId) => set({ selectedId, selectedEdgeId: null, multi: [] }),
  selectEdge: (selectedEdgeId) => set({ selectedEdgeId, selectedId: null, multi: [] }),
  setEdgeWeight: (id, weight) =>
    set((s) => ({ edges: s.edges.map((e) => (e.id === id ? { ...e, data: { ...(e.data ?? {}), weight } } : e)) })),
  setView: (view) => set({ view }),
  formatLayout: () => set((s) => ({ nodes: orderNodes(formatNodes(s.nodes, s.edges)) })),
  reset: () => set((s) => ({ nodes: INITIAL_NODES, edges: INITIAL_EDGES, multi: [], req: null, reqFocus: null, selectedId: "db", selectedEdgeId: null, view: "overview", workload: DEFAULT_WORKLOAD, design: s.design.id ? s.design : { ...s.design } })),
}));

/** True on share pages and for team viewers: the canvas can be explored but nothing can be changed. */
export const useReadOnly = () => useStudio((s) => s.design.shared || s.design.level === "view");


// ---- undo and redo for the canvas itself (nodes and links), as opposed to the delete / best-value toasts

interface Snap { nodes: StudioNode[]; edges: Edge[] }
const hist: { past: Snap[]; future: Snap[]; base: Snap; key: string; flush: (() => void) | null } = { past: [], future: [], base: { nodes: [], edges: [] }, key: "", flush: null };
const MAX_HISTORY = 100;
/** What counts as a change worth undoing: where things are and what they are, not how React Flow measured them. */
const keyOf = (s: Snap) => JSON.stringify([s.nodes.map((n) => [n.id, n.parentId, n.position, n.data, n.style]), s.edges.map((e) => [e.id, e.source, e.target, e.data])]);
const publish = () => useStudio.setState({ histLen: { past: hist.past.length, future: hist.future.length } });
const restore = (to: Snap) => { hist.base = to; hist.key = keyOf(to); useStudio.setState({ nodes: to.nodes, edges: to.edges, selectedId: null, selectedEdgeId: null, multi: [] }); publish(); };

/** Starts recording edits. A burst of changes (a drag, typing a name) becomes one step. Call once; returns a stop function. */
export function startHistory(): () => void {
  const reset = () => { const s = useStudio.getState(); hist.past = []; hist.future = []; hist.base = { nodes: s.nodes, edges: s.edges }; hist.key = keyOf(hist.base); publish(); };
  reset();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const commit = () => {
    clearTimeout(timer);
    const s = useStudio.getState();
    const now = { nodes: s.nodes, edges: s.edges }, key = keyOf(now);
    if (key === hist.key) { hist.base = now; return; }
    hist.past.push(hist.base);
    if (hist.past.length > MAX_HISTORY) hist.past.shift();
    hist.future = [];
    hist.base = now; hist.key = key;
    publish();
  };
  hist.flush = commit;
  const stop = useStudio.subscribe((st, prev) => {
    if (st.design.key !== prev.design.key) { clearTimeout(timer); reset(); return; }
    if (st.nodes !== prev.nodes || st.edges !== prev.edges) { clearTimeout(timer); timer = setTimeout(commit, 400); }
  });
  return () => { stop(); clearTimeout(timer); hist.flush = null; };
}

export function undo(): void {
  hist.flush?.();
  const prev = hist.past.pop();
  if (!prev) return;
  hist.future.push(hist.base);
  restore(prev);
}

export function redo(): void {
  hist.flush?.();
  const next = hist.future.pop();
  if (!next) return;
  hist.past.push(hist.base);
  restore(next);
}
