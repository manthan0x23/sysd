import type { Edge } from "@xyflow/react";
import type { StudioNode } from "./model";

/** Editing a group of nodes at once: copy, paste, duplicate, align, distribute. Pure, so each can be tested. */

export const GRID = 11;
export const PASTE_STEP = GRID * 4;
const snap = (v: number) => Math.round(v / GRID) * GRID;

/** The nodes, plus everything inside any server or container among them. */
export function withDescendants(nodes: StudioNode[], ids: Iterable<string>): Set<string> {
  const set = new Set(ids);
  let grew = true;
  while (grew) { grew = false; for (const n of nodes) if (n.parentId && set.has(n.parentId) && !set.has(n.id)) { set.add(n.id); grew = true; } }
  return set;
}

export interface Clip { nodes: StudioNode[]; edges: Edge[] }

/** What a copy holds: the chosen nodes with their contents, and the links that run between them. */
export function clipOf(nodes: StudioNode[], edges: Edge[], ids: Iterable<string>): Clip {
  const set = withDescendants(nodes, ids);
  return { nodes: nodes.filter((n) => set.has(n.id)), edges: edges.filter((e) => set.has(e.source) && set.has(e.target)) };
}

let seq = 0;
const freshId = (typeId: string) => `${typeId}-${Date.now().toString(36)}${(seq++).toString(36)}`;

/**
 * Fresh copies of a clip, moved by (dx, dy). Nodes whose server is not part of the clip stay in that server (if it
 * still exists); links keep their traffic weights. Returns the new nodes ahead of nothing: the caller orders them.
 */
export function cloneClip(clip: Clip, existing: StudioNode[], dx: number, dy: number): { nodes: StudioNode[]; edges: Edge[] } {
  const inClip = new Set(clip.nodes.map((n) => n.id));
  const alive = new Set(existing.map((n) => n.id));
  const idMap = new Map(clip.nodes.map((n) => [n.id, freshId(n.data.typeId)]));
  const nodes = clip.nodes.map((n) => {
    const { measured: _m, selected: _s, dragging: _d, ...rest } = n as StudioNode & { measured?: unknown; dragging?: boolean };
    void _m; void _s; void _d;
    const parentInClip = Boolean(n.parentId && inClip.has(n.parentId));
    const keepParent = parentInClip || Boolean(n.parentId && alive.has(n.parentId));
    const copy: StudioNode = {
      ...rest,
      id: idMap.get(n.id)!,
      // A node inside a copied server keeps its place in it; every other top piece moves.
      position: parentInClip ? { ...n.position } : { x: snap(n.position.x + dx), y: snap(n.position.y + dy) },
      data: { ...n.data },
    };
    if (keepParent) copy.parentId = parentInClip ? idMap.get(n.parentId!)! : n.parentId;
    else delete copy.parentId;
    return copy;
  });
  const edges = clip.edges.map((e) => {
    const source = idMap.get(e.source)!, target = idMap.get(e.target)!;
    const { selected: _s, ...rest } = e;
    void _s;
    return { ...rest, id: `e-${source}-${target}`, source, target };
  });
  return { nodes, edges };
}

export type AlignMode = "left" | "center" | "right" | "top" | "middle" | "bottom";
export type DistributeAxis = "horizontal" | "vertical";

const sizeOf = (n: StudioNode) => ({
  w: n.measured?.width ?? (typeof n.style?.width === "number" ? n.style.width : n.width ?? 142),
  h: n.measured?.height ?? (typeof n.style?.height === "number" ? n.style.height : n.height ?? 64),
});

/** Only nodes that share a parent can be lined up (positions are relative to it); the first one picked decides which. */
function sameLevel(nodes: StudioNode[], ids: string[]): StudioNode[] {
  const picked = ids.map((id) => nodes.find((n) => n.id === id)).filter((n): n is StudioNode => Boolean(n));
  if (!picked.length) return [];
  const parent = picked[0].parentId;
  return picked.filter((n) => n.parentId === parent);
}

/** Lines the chosen nodes up on one edge or centre line. */
export function alignNodes(nodes: StudioNode[], ids: string[], mode: AlignMode): StudioNode[] {
  const group = sameLevel(nodes, ids);
  if (group.length < 2) return nodes;
  const box = group.map((n) => ({ n, ...sizeOf(n) }));
  const left = Math.min(...box.map((b) => b.n.position.x)), right = Math.max(...box.map((b) => b.n.position.x + b.w));
  const top = Math.min(...box.map((b) => b.n.position.y)), bottom = Math.max(...box.map((b) => b.n.position.y + b.h));
  const to = new Map<string, { x: number; y: number }>();
  for (const b of box) {
    const p = { ...b.n.position };
    if (mode === "left") p.x = left;
    else if (mode === "right") p.x = right - b.w;
    else if (mode === "center") p.x = (left + right) / 2 - b.w / 2;
    else if (mode === "top") p.y = top;
    else if (mode === "bottom") p.y = bottom - b.h;
    else p.y = (top + bottom) / 2 - b.h / 2;
    to.set(b.n.id, { x: snap(p.x), y: snap(p.y) });
  }
  return nodes.map((n) => (to.has(n.id) ? { ...n, position: to.get(n.id)! } : n));
}

/** Spaces the chosen nodes evenly between the outermost two. */
export function distributeNodes(nodes: StudioNode[], ids: string[], axis: DistributeAxis): StudioNode[] {
  const group = sameLevel(nodes, ids);
  if (group.length < 3) return nodes;
  const h = axis === "horizontal";
  const box = group.map((n) => ({ n, ...sizeOf(n) })).sort((a, b) => (h ? a.n.position.x - b.n.position.x : a.n.position.y - b.n.position.y));
  const len = (b: (typeof box)[number]) => (h ? b.w : b.h);
  const start = h ? box[0].n.position.x : box[0].n.position.y;
  const last = box[box.length - 1];
  const end = (h ? last.n.position.x : last.n.position.y) + len(last);
  const gap = (end - start - box.reduce((s, b) => s + len(b), 0)) / (box.length - 1);
  const to = new Map<string, { x: number; y: number }>();
  let at = start;
  for (const b of box) {
    to.set(b.n.id, h ? { x: snap(at), y: b.n.position.y } : { x: b.n.position.x, y: snap(at) });
    at += len(b) + gap;
  }
  return nodes.map((n) => (to.has(n.id) ? { ...n, position: to.get(n.id)! } : n));
}

/** Moves the chosen nodes (top pieces only: what sits inside a moved server moves with it). */
export function nudgeNodes(nodes: StudioNode[], ids: string[], dx: number, dy: number): StudioNode[] {
  const set = new Set(ids);
  return nodes.map((n) => (set.has(n.id) && !(n.parentId && set.has(n.parentId)) ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } } : n));
}
