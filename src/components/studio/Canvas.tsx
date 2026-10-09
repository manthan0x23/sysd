"use client";

import { useCallback, useEffect, useMemo, useState, type DragEvent } from "react";
import {
  Background, BackgroundVariant, MarkerType, ReactFlow, SelectionMode, useReactFlow,
  type Edge, type NodeChange,
} from "@xyflow/react";
import { TYPE_BY_ID, checkLink } from "@/lib/catalog";
import { routeEdges, type Pt } from "@/lib/route";
import { useStudio, type StudioNode } from "@/store/useStudio";
import { FlowEdge, type FlowEdgeData } from "./FlowEdge";
import { HostNode } from "./HostNode";
import { NodeCard } from "./NodeCard";
import { DRAG_TYPE } from "./Palette";
import { SelectionBar } from "./SelectionBar";
import { useAnalysis } from "./useAnalysis";

const nodeTypes = { card: NodeCard, host: HostNode };
const edgeTypes = { flow: FlowEdge };
const GRID: [number, number] = [11, 11];

/** Keep children clear of the host header (top) and fit meters (bottom). */
const inside = (p: { x: number; y: number }) => ({ x: Math.max(12, p.x), y: Math.max(66, p.y) });

export function Canvas({ readOnly }: { readOnly: boolean }) {
  const { nodes, edges, sim, fits } = useAnalysis();
  const mode = useStudio((s) => s.mode);
  const selectedId = useStudio((s) => s.selectedId);
  const selectedEdgeId = useStudio((s) => s.selectedEdgeId);
  const multi = useStudio((s) => s.multi);
  const tool = useStudio((s) => s.tool);
  const tracing = useStudio((s) => s.reqFocus != null);
  const { onNodesChange, onEdgesChange, onConnect, addNode, reparent, select, selectEdge, rememberDeleted } = useStudio.getState();
  const { screenToFlowPosition, getInternalNode } = useReactFlow();

  const learn = mode === "learn";

  const viewNodes = useMemo<StudioNode[]>(
    () => nodes.map((n) => ({ ...n, selected: n.id === selectedId || multi.includes(n.id), data: { ...n.data, util: sim.util[n.id], load: sim.load[n.id], instances: sim.instances[n.id], backlog: sim.backlog[n.id], showMetrics: learn, fit: fits[n.id] } })),
    [nodes, sim, fits, learn, selectedId, multi],
  );
  /** The meaning of a link, or why it is not valid. Old designs may hold links the rules now refuse; they stay, flagged. */
  const linkInfo = useCallback((e: Edge): Pick<FlowEdgeData, "role" | "invalid"> => {
    const a = nodes.find((n) => n.id === e.source), b = nodes.find((n) => n.id === e.target);
    if (!a || !b) return {};
    const c = checkLink(a.data.typeId, b.data.typeId);
    return c.ok ? { role: c.role.label } : { invalid: c.reason };
  }, [nodes]);
  // Plan the links once the nodes stop moving, so they run around nodes instead of through them.
  const [routes, setRoutes] = useState<Record<string, Pt[]>>({});
  useEffect(() => {
    const t = setTimeout(() => setRoutes(routeEdges(nodes, edges)), 140);
    return () => clearTimeout(t);
  }, [nodes, edges]);
  /** What a link looks like next to the selection: lit when it touches it, faded when something else is selected. */
  const focusOf = useCallback((e: Edge): "hl" | "dim" | undefined => {
    if (selectedEdgeId) return e.id === selectedEdgeId ? "hl" : "dim";
    if (!selectedId && !multi.length) return undefined;
    const kids = new Set<string>(selectedId ? [selectedId] : multi);
    for (const n of nodes) if (n.parentId && kids.has(n.parentId)) kids.add(n.id);
    return kids.has(e.source) || kids.has(e.target) ? "hl" : "dim";
  }, [selectedId, selectedEdgeId, multi, nodes]);
  const viewEdges = useMemo<Edge<FlowEdgeData>[]>(
    () => edges.map((e) => ({ ...e, selected: e.id === selectedEdgeId, markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: "currentColor" }, data: { weight: (e.data as { weight?: number } | undefined)?.weight, load: sim.edgeLoad[e.id], show: learn, route: routes[e.id], busy: (sim.edgeLoad[e.id] ?? 0) >= 0.15 * (sim.entryRps || 1), focus: focusOf(e), ...linkInfo(e) }, zIndex: focusOf(e) === "hl" ? 5 : 0 })),
    [edges, linkInfo, sim, learn, selectedEdgeId, routes, focusOf],
  );

  const isValidConnection = useCallback((c: { source: string; target: string }) => {
    if (c.source === c.target) return false;
    const a = nodes.find((n) => n.id === c.source), b = nodes.find((n) => n.id === c.target);
    return Boolean(a && b && checkLink(a.data.typeId, b.data.typeId).ok && !edges.some((e) => e.source === c.source && e.target === c.target));
  }, [nodes, edges]);
  /** Dropping a link on a node that cannot take it says why, instead of silently doing nothing. */
  const onConnectEnd = useCallback((_: unknown, state: { isValid: boolean | null; fromNode: { id: string } | null; toNode: { id: string } | null }) => {
    if (state.isValid !== false || !state.fromNode || !state.toNode || state.fromNode.id === state.toNode.id) return;
    const a = nodes.find((n) => n.id === state.fromNode!.id), b = nodes.find((n) => n.id === state.toNode!.id);
    if (!a || !b) return;
    const c = checkLink(a.data.typeId, b.data.typeId);
    useStudio.getState().setLinkNotice(c.ok ? "Those two are already linked." : c.reason);
  }, [nodes]);

  // Selection is owned by our store (the inspector reads it), so ignore React Flow's own select changes.
  // Selection changes (a marquee, shift-click) are folded into selectedId / multi; everything else goes to React Flow as usual.
  const handleNodes = useCallback((changes: NodeChange<StudioNode>[]) => {
    const picks = changes.flatMap((c) => (c.type === "select" ? [{ id: c.id, selected: c.selected }] : []));
    if (picks.length) useStudio.getState().applySelect(picks);
    const rest = changes.filter((c) => c.type !== "select");
    if (rest.length) onNodesChange(rest);
  }, [onNodesChange]);

  const absOf = (id: string) => getInternalNode(id)?.internals.positionAbsolute ?? { x: 0, y: 0 };

  /** The smallest host block under a point that is allowed to hold a node of this type. */
  const pickHost = (typeId: string, x: number, y: number, selfId?: string) => {
    const type = TYPE_BY_ID[typeId];
    if (type.host === "server") return null;
    if (!type.host && !type.hostable) return null;
    const banned = new Set<string>();
    if (selfId) {
      banned.add(selfId);
      let grew = true;
      while (grew) { grew = false; for (const n of nodes) if (n.parentId && banned.has(n.parentId) && !banned.has(n.id)) { banned.add(n.id); grew = true; } }
    }
    let best: { id: string; area: number } | null = null;
    for (const h of nodes) {
      const ht = TYPE_BY_ID[h.data.typeId];
      if (!ht.host || banned.has(h.id)) continue;
      if (type.host === "container" && ht.host !== "server") continue;
      const internal = getInternalNode(h.id);
      if (!internal) continue;
      const { x: hx, y: hy } = internal.internals.positionAbsolute;
      // Fall back to the declared size until React Flow has measured a freshly added block.
      const w = internal.measured.width ?? (typeof h.style?.width === "number" ? h.style.width : 0);
      const hgt = internal.measured.height ?? (typeof h.style?.height === "number" ? h.style.height : 0);
      if (x >= hx && x <= hx + w && y >= hy && y <= hy + hgt && (!best || w * hgt < best.area)) best = { id: h.id, area: w * hgt };
    }
    return best?.id ?? null;
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    if (readOnly) return;
    const typeId = e.dataTransfer.getData(DRAG_TYPE);
    if (!typeId || !TYPE_BY_ID[typeId]) return;
    const p = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const hostId = pickHost(typeId, p.x, p.y);
    const base = TYPE_BY_ID[typeId].host ? { x: p.x - 40, y: p.y - 40 } : { x: p.x - 71, y: p.y - 32 };
    const origin = hostId ? absOf(hostId) : { x: 0, y: 0 };
    const snap = (v: number, g: number) => Math.round(v / g) * g;
    const rel = { x: snap(base.x - origin.x, GRID[0]), y: snap(base.y - origin.y, GRID[1]) };
    addNode(typeId, hostId ? inside(rel) : rel, hostId ?? undefined);
  };

  const onNodeDragStop = (_: unknown, node: StudioNode) => {
    if (readOnly) return;
    const internal = getInternalNode(node.id);
    if (!internal) return;
    const abs = internal.internals.positionAbsolute;
    const cx = abs.x + (internal.measured.width ?? 142) / 2;
    const cy = abs.y + (internal.measured.height ?? 64) / 2;
    const hostId = pickHost(node.data.typeId, cx, cy, node.id);
    if ((hostId ?? undefined) === node.parentId) return;
    const origin = hostId ? absOf(hostId) : { x: 0, y: 0 };
    const rel = { x: abs.x - origin.x, y: abs.y - origin.y };
    reparent(node.id, hostId, hostId ? inside(rel) : rel);
  };

  return (
    <section className="canvas" aria-label="System canvas">
      <ReactFlow
        nodes={viewNodes} edges={viewEdges} nodeTypes={nodeTypes} edgeTypes={edgeTypes}
        onNodesChange={handleNodes} onEdgesChange={onEdgesChange} onConnect={onConnect} isValidConnection={isValidConnection} onConnectEnd={onConnectEnd}
        onNodeClick={(e, n) => { if (!(e.shiftKey || e.metaKey || e.ctrlKey)) select(n.id); }} onEdgeClick={(_, e) => selectEdge(e.id)} onPaneClick={() => { select(null); selectEdge(null); }} onNodeDragStop={onNodeDragStop}
        onDrop={onDrop} onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
        defaultEdgeOptions={{ type: "flow" }} proOptions={{ hideAttribution: true }}
        selectionOnDrag={tool === "select" && !readOnly} selectionMode={SelectionMode.Partial} disableKeyboardA11y panOnDrag={tool === "pan" ? true : [1, 2]} panActivationKeyCode="Space" multiSelectionKeyCode={["Shift", "Meta", "Control"]}
        snapToGrid snapGrid={GRID} minZoom={0.2} maxZoom={1.6} nodesDraggable={!readOnly} nodesConnectable={!readOnly}
        fitView fitViewOptions={{ padding: { top: "80px", right: "400px", bottom: "110px", left: "260px" } }}
        deleteKeyCode={readOnly ? null : ["Backspace", "Delete"]}
        onBeforeDelete={async ({ nodes: dn, edges: de }) => {
          const st = useStudio.getState();
          const ids = new Set(dn.map((n) => n.id));
          const label = dn.length > 1 ? `${dn.length} services` : dn[0] ? (st.nodes.find((n) => n.id === dn[0].id)?.data.name || "service") : "link";
          rememberDeleted(label, st.nodes.filter((n) => ids.has(n.id)), st.edges.filter((e) => de.some((x) => x.id === e.id) || ids.has(e.source) || ids.has(e.target)));
          return true;
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} color="var(--dot)" />
        {!readOnly && multi.length > 1 && !tracing && <SelectionBar ids={multi} />}
      </ReactFlow>
    </section>
  );
}
