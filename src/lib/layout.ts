import type { Edge } from "@xyflow/react";
import { TYPE_BY_ID } from "./catalog";
import type { StudioNode } from "./model";

const CARD = { w: 142, h: 64 };
const GAP_X = 110, GAP_Y = 44;
const PAD = { top: 66, side: 33, bottom: 55 };
const MIN_HOST = { server: { w: 363, h: 231 }, container: { w: 275, h: 143 } };
const GRID = 11;
const snap = (n: number) => Math.round(n / GRID) * GRID;

interface Item { id: string; w: number; h: number; x: number; y: number }

/**
 * Lays out one level of the hierarchy left to right: sources on the left, each link pointing right.
 * Layers come from the longest path, order inside a layer from a few barycentre sweeps (fewer crossings),
 * and each node is pulled towards the middle of its neighbours so straight chains end up on one horizontal line.
 * Everything is snapped to the canvas grid (11px) so nodes line up on both axes.
 */
function layoutLevel(items: Item[], links: [string, string][]): { w: number; h: number } {
  const ids = new Set(items.map((i) => i.id));
  const out = new Map<string, string[]>(), inn = new Map<string, string[]>();
  for (const i of items) { out.set(i.id, []); inn.set(i.id, []); }
  const seen = new Set<string>();
  for (const [a, b] of links) {
    if (a === b || !ids.has(a) || !ids.has(b) || seen.has(`${a}>${b}`)) continue;
    seen.add(`${a}>${b}`);
    out.get(a)!.push(b); inn.get(b)!.push(a);
  }
  // Only edges that go "forwards" shape the layers. Depth is the shortest distance from a node with no inputs, so a
  // link that runs back to an earlier layer (verdicts flowing back to the servers, a retry loop) is drawn as a back
  // edge instead of dragging its target to the far right.
  const depth0 = new Map<string, number>();
  const roots = items.filter((i) => inn.get(i.id)!.length === 0).map((i) => i.id);
  const queue = roots.length ? [...roots] : [items[0]?.id].filter(Boolean) as string[];
  queue.forEach((id) => depth0.set(id, 0));
  for (let h = 0; h < queue.length; h++) for (const v of out.get(queue[h])!) if (!depth0.has(v)) { depth0.set(v, depth0.get(queue[h])! + 1); queue.push(v); }
  for (const i of items) if (!depth0.has(i.id)) depth0.set(i.id, 0); // unreachable cycles
  const fwd = new Map<string, string[]>(items.map((i) => [i.id, []]));
  for (const [u, vs] of out) for (const v of vs) if (depth0.get(v)! > depth0.get(u)!) fwd.get(u)!.push(v);
  const preds = new Map<string, string[]>(items.map((i) => [i.id, []]));
  for (const [u, vs] of fwd) for (const v of vs) preds.get(v)!.push(u);

  const layer = new Map<string, number>();
  const depth = (id: string): number => {
    if (layer.has(id)) return layer.get(id)!;
    const d = preds.get(id)!.length ? 1 + Math.max(...preds.get(id)!.map(depth)) : 0;
    layer.set(id, d);
    return d;
  };
  items.forEach((i) => depth(i.id));
  const nLayers = Math.max(0, ...layer.values()) + 1;
  const cols: Item[][] = Array.from({ length: nLayers }, () => []);
  const byId = new Map(items.map((i) => [i.id, i]));
  for (const i of items) cols[layer.get(i.id)!].push(i);

  // Crossing reduction: order by the average position of neighbours, alternating directions.
  const order = new Map<string, number>();
  const reindex = () => cols.forEach((c) => c.forEach((i, k) => order.set(i.id, k)));
  reindex();
  const bary = (i: Item, nbrs: string[]) => (nbrs.length ? nbrs.reduce((s, n) => s + order.get(n)!, 0) / nbrs.length : order.get(i.id)!);
  const succs = new Map<string, string[]>(items.map((i) => [i.id, fwd.get(i.id)!]));
  for (let pass = 0; pass < 4; pass++) {
    const range = pass % 2 ? [...cols.keys()].reverse() : [...cols.keys()];
    for (const c of range) {
      const nbrs = pass % 2 ? succs : preds;
      cols[c].sort((a, b) => bary(a, nbrs.get(a.id)!) - bary(b, nbrs.get(b.id)!) || order.get(a.id)! - order.get(b.id)!);
      reindex();
    }
  }

  // x: columns side by side, each as wide as its widest node; nodes are centred in their column.
  let x = 0;
  const colX: number[] = [], colW: number[] = [];
  cols.forEach((c, k) => { colW[k] = Math.max(0, ...c.map((i) => i.w)); colX[k] = x; x += colW[k] + GAP_X; });
  const stack = (c: Item[], want: (i: Item, k: number) => number) => {
    // Place nodes top to bottom in their order, as close to the wanted y as the spacing allows.
    let top = -Infinity;
    c.forEach((i, k) => {
      const t = Math.max(want(i, k) - i.h / 2, top === -Infinity ? -Infinity : top);
      i.y = t; top = t + i.h + GAP_Y;
    });
  };
  cols.forEach((c) => { let y = 0; c.forEach((i) => { i.y = y; y += i.h + GAP_Y; }); });
  const centre = (i: Item) => i.y + i.h / 2;
  for (let pass = 0; pass < 6; pass++) {
    const range = pass % 2 ? [...cols.keys()].reverse() : [...cols.keys()];
    for (const k of range) {
      const nbrs = pass % 2 ? succs : preds;
      stack(cols[k], (i) => { const n = nbrs.get(i.id)!.map((id) => centre(byId.get(id)!)); return n.length ? n.reduce((a, b) => a + b, 0) / n.length : centre(i); });
    }
  }

  const minY = Math.min(0, ...items.map((i) => i.y));
  cols.forEach((c, k) => c.forEach((i) => { i.x = snap(colX[k] + (colW[k] - i.w) / 2); i.y = snap(i.y - minY); }));
  const w = Math.max(0, ...items.map((i) => i.x + i.w));
  const h = Math.max(0, ...items.map((i) => i.y + i.h));
  return { w, h };
}

/**
 * Returns the nodes with new positions (and sizes for servers and containers): everything axis-aligned on the
 * canvas grid with even spacing. Services inside a host are laid out inside it and the host grows to fit them.
 */
export function formatNodes(nodes: StudioNode[], edges: Edge[]): StudioNode[] {
  const kids = new Map<string | undefined, StudioNode[]>();
  for (const n of nodes) { const k = n.parentId && nodes.some((p) => p.id === n.parentId) ? n.parentId : undefined; kids.set(k, [...(kids.get(k) ?? []), n]); }
  const parentOf = new Map(nodes.map((n) => [n.id, n.parentId]));
  const result = new Map<string, StudioNode>();

  /** The ancestor of `id` (or itself) that sits at the level whose members are `level`. */
  const upTo = (id: string, level: Set<string>): string | null => {
    for (let cur: string | undefined = id; cur; cur = parentOf.get(cur)) if (level.has(cur)) return cur;
    return null;
  };

  function place(parent: string | undefined): { w: number; h: number } {
    const members = kids.get(parent) ?? [];
    const level = new Set(members.map((m) => m.id));
    const items: Item[] = members.map((m) => {
      if (m.type === "host") {
        const inner = place(m.id);
        const min = MIN_HOST[TYPE_BY_ID[m.data.typeId].host === "container" ? "container" : "server"];
        const w = Math.max(min.w, snap(inner.w + PAD.side * 2)), h = Math.max(min.h, snap(inner.h + PAD.top + PAD.bottom));
        return { id: m.id, w, h, x: 0, y: 0 };
      }
      return { id: m.id, w: CARD.w, h: CARD.h, x: 0, y: 0 };
    });
    const links: [string, string][] = [];
    for (const e of edges) { const a = upTo(e.source, level), b = upTo(e.target, level); if (a && b) links.push([a, b]); }
    const size = layoutLevel(items, links);
    for (const it of items) {
      const n = members.find((m) => m.id === it.id)!;
      const prev = result.get(n.id) ?? n;
      const off = parent ? { x: PAD.side, y: PAD.top } : { x: 0, y: 0 };
      result.set(n.id, { ...prev, position: { x: it.x + off.x, y: it.y + off.y }, ...(n.type === "host" ? { style: { ...n.style, width: it.w, height: it.h } } : {}) });
    }
    return size;
  }
  place(undefined);
  return nodes.map((n) => result.get(n.id) ?? n);
}
