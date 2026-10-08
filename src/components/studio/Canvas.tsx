"use client";

import { useCallback, useMemo, type DragEvent } from "react";
import {
  Background, BackgroundVariant, Controls, MarkerType, ReactFlow, useReactFlow,
  type Edge, type NodeChange,
} from "@xyflow/react";
import { TYPE_BY_ID } from "@/lib/catalog";
import { useStudio, type StudioNode } from "@/store/useStudio";
import { FlowEdge, type FlowEdgeData } from "./FlowEdge";
import { HostNode } from "./HostNode";
import { NodeCard } from "./NodeCard";
import { DRAG_TYPE } from "./Palette";
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
  const { onNodesChange, onEdgesChange, onConnect, addNode, reparent, select, selectEdge } = useStudio.getState();
  const { screenToFlowPosition, getInternalNode } = useReactFlow();

  const learn = mode === "learn";

  const viewNodes = useMemo<StudioNode[]>(
    () => nodes.map((n) => ({ ...n, selected: n.id === selectedId, data: { ...n.data, util: sim.util[n.id], load: sim.load[n.id], showMetrics: learn, fit: fits[n.id] } })),
    [nodes, sim, fits, learn, selectedId],
  );
  const viewEdges = useMemo<Edge<FlowEdgeData>[]>(
    () => edges.map((e) => ({ ...e, selected: e.id === selectedEdgeId, markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: "currentColor" }, data: { weight: (e.data as { weight?: number } | undefined)?.weight, load: sim.edgeLoad[e.id], show: learn } })),
    [edges, sim, learn, selectedEdgeId],
  );

  // Selection is owned by our store (the inspector reads it), so ignore React Flow's own select changes.
  const handleNodes = useCallback((changes: NodeChange<StudioNode>[]) => onNodesChange(changes.filter((c) => c.type !== "select")), [onNodesChange]);

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
        onNodesChange={handleNodes} onEdgesChange={onEdgesChange} onConnect={onConnect}
        onNodeClick={(_, n) => select(n.id)} onEdgeClick={(_, e) => selectEdge(e.id)} onPaneClick={() => { select(null); selectEdge(null); }} onNodeDragStop={onNodeDragStop}
        onDrop={onDrop} onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
        defaultEdgeOptions={{ type: "flow" }}
        snapToGrid snapGrid={GRID} minZoom={0.2} maxZoom={1.6} nodesDraggable={!readOnly} nodesConnectable={!readOnly}
        fitView fitViewOptions={{ padding: { top: "110px", right: "400px", bottom: "40px", left: "260px" } }}
        deleteKeyCode={readOnly ? null : ["Backspace", "Delete"]}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} color="var(--dot)" />
        <Controls showInteractive={false} position="bottom-center" orientation="horizontal" />
      </ReactFlow>
    </section>
  );
}
