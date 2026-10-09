import type { Edge } from "@xyflow/react";
import type { StudioNode } from "./model";

export type Pt = [number, number];

/**
 * Orthogonal link routing. Every link leaves its source on the right, arrives at its target from the left, and in
 * between runs along the canvas grid (11 px) with right-angle bends. Links never cross a node, never run through a
 * server block that neither end sits in, and prefer their own lane: where another link already runs the same way,
 * the cost goes up, so parallel links fan out instead of piling on one line.
 *
 * A* over (cell, direction) states with a penalty per bend. Boards are small (tens of nodes), so this is fast enough
 * to run again whenever the nodes settle.
 */
const G = 11;
const CARD = { w: 142, h: 64 };
const STUB = 22; // straight run out of a handle before the first turn
const MARGIN = 1; // cells of clearance around a node
const BEND = 12;
const SAME_LANE = 14; // sharing a line with an unrelated link: strongly avoided, so lanes stay readable
const MERGE = -0.7; // sharing a line with a link from the same source or into the same target: encouraged (a trunk)
const NEAR = 2.5; // running right beside an unrelated link
const BORDER = 5; // running along the edge of a server block looks like part of its outline
const CROSS = 4;
const MAX_STEPS = 250_000;

interface Rect { x: number; y: number; w: number; h: number }
const E = 0, W = 2;
const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

/** Absolute position and size of every node. */
function rects(nodes: StudioNode[]): Map<string, Rect & { host: boolean }> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const abs = (n: StudioNode): { x: number; y: number } => {
    const p = n.parentId ? byId.get(n.parentId) : undefined;
    const o = p ? abs(p) : { x: 0, y: 0 };
    return { x: o.x + n.position.x, y: o.y + n.position.y };
  };
  const out = new Map<string, Rect & { host: boolean }>();
  for (const n of nodes) {
    const host = n.type === "host";
    const w = num(n.measured?.width) ?? num(n.width) ?? num(n.style?.width) ?? (host ? 300 : CARD.w);
    const h = num(n.measured?.height) ?? num(n.height) ?? num(n.style?.height) ?? (host ? 190 : CARD.h);
    out.set(n.id, { ...abs(n), w, h, host });
  }
  return out;
}

class Heap {
  private a: { k: number; v: number }[] = [];
  get size() { return this.a.length; }
  push(k: number, v: number) {
    const a = this.a; a.push({ k, v });
    let i = a.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (a[p].k <= a[i].k) break; [a[p], a[i]] = [a[i], a[p]]; i = p; }
  }
  pop(): number {
    const a = this.a, top = a[0], last = a.pop()!;
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1; let m = i;
        if (l < a.length && a[l].k < a[m].k) m = l;
        if (r < a.length && a[r].k < a[m].k) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]]; i = m;
      }
    }
    return top.v;
  }
}

/** Routes for every link, keyed by edge id. Points are absolute canvas coordinates, handle to handle. */
export function routeEdges(nodes: StudioNode[], edges: Edge[], stats?: { fallback: string[] }): Record<string, Pt[]> {
  const R = rects(nodes);
  if (!R.size) return {};
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const r of R.values()) { minX = Math.min(minX, r.x); minY = Math.min(minY, r.y); maxX = Math.max(maxX, r.x + r.w); maxY = Math.max(maxY, r.y + r.h); }
  const PAD = 18 * G;
  // Grid rows sit on y = 10 (mod 11) and columns on x = 0 (mod 11), so a card's handles (at x, x + 142, y + 32 on the
  // canvas grid) fall exactly on grid lines and links leave them without a jog.
  const ox = Math.floor((minX - PAD) / G) * G;
  const oy = Math.floor((minY - PAD - 10) / G) * G + 10;
  const cols = Math.ceil((maxX + PAD - ox) / G) + 1, rows = Math.ceil((maxY + PAD - oy) / G) + 1;
  const cx = (x: number) => Math.round((x - ox) / G), cy = (y: number) => Math.round((y - oy) / G);
  const px = (c: number) => ox + c * G, py = (r: number) => oy + r * G;

  const cardBlock = new Uint8Array(cols * rows);
  const hosts = [...R.entries()].filter(([, r]) => r.host);
  for (const [, r] of R) {
    if (r.host) continue;
    for (let j = cy(r.y) - MARGIN; j <= cy(r.y + r.h) + MARGIN; j++) for (let i = cx(r.x) - MARGIN; i <= cx(r.x + r.w) + MARGIN; i++) if (i >= 0 && j >= 0 && i < cols && j < rows) cardBlock[j * cols + i] = 1;
  }
  const hostBorder = new Uint8Array(cols * rows);
  for (const [, r] of hosts) {
    const i0 = cx(r.x), i1 = cx(r.x + r.w), j0 = cy(r.y), j1 = cy(r.y + r.h);
    for (let i = i0; i <= i1; i++) for (const j of [j0, j1]) if (i >= 0 && j >= 0 && i < cols && j < rows) hostBorder[j * cols + i] = 1;
    for (let j = j0; j <= j1; j++) for (const i of [i0, i1]) if (i >= 0 && j >= 0 && i < cols && j < rows) hostBorder[j * cols + i] = 1;
  }
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const ancestors = (id: string) => { const s = new Set<string>(); for (let n = byId.get(id); n?.parentId; n = byId.get(n.parentId)) s.add(n.parentId); return s; };

  // Who last drew on each cell (1-based index of the link's source and target), horizontally and vertically.
  const hS = new Uint16Array(cols * rows), hT = new Uint16Array(cols * rows), vS = new Uint16Array(cols * rows), vT = new Uint16Array(cols * rows);
  const ids = new Map<string, number>();
  const idOf = (id: string) => ids.get(id) ?? (ids.set(id, ids.size + 1), ids.size);
  const hostMask = new Uint8Array(cols * rows);
  const total = cols * rows * 4;
  const g = new Float32Array(total), from = new Int32Array(total), closed = new Uint8Array(total);
  const result: Record<string, Pt[]> = {};

  // Short links first: they claim the straight lanes, longer ones route around. Links from one source go together,
  // so the first one lays the trunk and the rest join it.
  const order = edges.map((e) => {
    const a = R.get(e.source), b = R.get(e.target);
    return { e, len: a && b ? Math.abs(b.x - a.x - a.w) + Math.abs(b.y + b.h / 2 - a.y - a.h / 2) : Infinity };
  }).sort((p, q) => p.len - q.len || (p.e.source < q.e.source ? -1 : 1));

  for (const { e } of order) {
    const a = R.get(e.source), b = R.get(e.target);
    if (!a || !b || e.source === e.target) continue;
    const sx = a.x + a.w, sy = a.y + a.h / 2, tx = b.x, ty = b.y + b.h / 2;
    const sid = idOf(e.source), tid = idOf(e.target);

    // Server blocks that neither end sits in cannot be crossed.
    hostMask.fill(0);
    const own = new Set([...ancestors(e.source), ...ancestors(e.target)]);
    for (const [id, r] of hosts) {
      if (own.has(id) || id === e.source || id === e.target) continue;
      for (let j = Math.max(0, cy(r.y)); j <= Math.min(rows - 1, cy(r.y + r.h)); j++) for (let i = Math.max(0, cx(r.x)); i <= Math.min(cols - 1, cx(r.x + r.w)); i++) hostMask[j * cols + i] = 1;
    }

    const si = Math.ceil((sx + STUB - ox) / G), sj = cy(sy);
    const ti = Math.floor((tx - STUB - ox) / G), tj = cy(ty);
    const inside = (i: number, j: number) => i >= 0 && j >= 0 && i < cols && j < rows;
    if (!inside(si, sj) || !inside(ti, tj)) continue;
    const free = (i: number, j: number) => inside(i, j) && !cardBlock[j * cols + i] && !hostMask[j * cols + i];

    g.fill(Infinity); closed.fill(0);
    const heap = new Heap();
    const state = (i: number, j: number, d: number) => ((j * cols + i) << 2) | d;
    const h = (i: number, j: number) => (Math.abs(i - ti) + Math.abs(j - tj)) * 1.0;
    const s0 = state(si, sj, E);
    g[s0] = 0; from[s0] = -1;
    heap.push(h(si, sj), s0);
    let goal = -1, steps = 0;
    while (heap.size && steps++ < MAX_STEPS) {
      const cur = heap.pop();
      if (closed[cur]) continue;
      closed[cur] = 1;
      const d = cur & 3, cell = cur >> 2, i = cell % cols, j = (cell / cols) | 0;
      if (i === ti && j === tj && d === E) { goal = cur; break; }
      for (let nd = 0; nd < 4; nd++) {
        if (nd === ((d + 2) & 3)) continue; // no U-turns in place
        const ni = i + DX[nd], nj = j + DY[nd];
        if (!free(ni, nj) && !(ni === ti && nj === tj)) continue;
        const ncell = nj * cols + ni;
        let cost = 1 + (nd !== d ? BEND : 0) + (hostBorder[ncell] ? BORDER : 0);
        const horiz = nd === E || nd === W;
        const [aS, aT, bS, bT] = horiz ? [hS, hT, vS, vT] : [vS, vT, hS, hT];
        if (aS[ncell]) cost += aS[ncell] === sid || aT[ncell] === tid ? MERGE : SAME_LANE;
        else {
          // beside an unrelated link (one cell either side of the direction of travel)
          const o1 = horiz ? ncell - cols : ncell - 1, o2 = horiz ? ncell + cols : ncell + 1;
          if ((aS[o1] && aS[o1] !== sid && aT[o1] !== tid) || (aS[o2] && aS[o2] !== sid && aT[o2] !== tid)) cost += NEAR;
        }
        if (bS[ncell] && bS[ncell] !== sid && bT[ncell] !== tid) cost += CROSS;
        const ns = state(ni, nj, nd), ng = g[cur] + cost;
        if (ng < g[ns]) { g[ns] = ng; from[ns] = cur; heap.push(ng + h(ni, nj), ns); }
      }
    }

    // The cells walked, then the corners among them.
    let cells: Pt[];
    if (goal >= 0) {
      const walk: Pt[] = [];
      for (let s = goal; s !== -1; s = from[s]) { const cell = s >> 2; walk.push([px(cell % cols), py((cell / cols) | 0)]); }
      cells = walk.reverse();
    } else {
      // No clear way found: a plain Z shape, so the link still draws.
      stats?.fallback.push(e.id);
      const mx = px(Math.round((si + ti) / 2));
      cells = [[px(si), sy], [mx, sy], [mx, ty], [px(ti), ty]];
    }
    // Start and end rows are the handles' own rows (equal to the grid row when nodes sit on the canvas grid).
    cells[0] = [cells[0][0], sy];
    cells[cells.length - 1] = [cells[cells.length - 1][0], ty];
    const pts: Pt[] = [[sx, sy], ...cells, [tx, ty]];
    // Keep corners only.
    const out: Pt[] = [pts[0]];
    for (let k = 1; k < pts.length - 1; k++) {
      const p = out[out.length - 1], c = pts[k], n = pts[k + 1];
      if ((p[0] === c[0] && c[0] === n[0]) || (p[1] === c[1] && c[1] === n[1])) continue;
      out.push(c);
    }
    out.push(pts[pts.length - 1]);
    // Mark the lanes this link now uses.
    for (let k = 0; k < out.length - 1; k++) {
      const [x1, y1] = out[k], [x2, y2] = out[k + 1];
      if (y1 === y2) { const j = cy(y1); for (let i = cx(Math.min(x1, x2)); i <= cx(Math.max(x1, x2)); i++) if (inside(i, j)) { hS[j * cols + i] = sid; hT[j * cols + i] = tid; } }
      else { const i = cx(x1); for (let j = cy(Math.min(y1, y2)); j <= cy(Math.max(y1, y2)); j++) if (inside(i, j)) { vS[j * cols + i] = sid; vT[j * cols + i] = tid; } }
    }
    result[e.id] = out;
  }
  return result;
}

/** A rounded-corner SVG path through the points, and the point halfway along it (for the label). */
export function roundedPath(pts: Pt[], radius = 9): { d: string; mid: Pt; label: Pt } {
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let k = 1; k < pts.length - 1; k++) {
    const p = pts[k - 1], c = pts[k], n = pts[k + 1];
    const l1 = Math.hypot(c[0] - p[0], c[1] - p[1]), l2 = Math.hypot(n[0] - c[0], n[1] - c[1]);
    const r = Math.min(radius, l1 / 2, l2 / 2);
    const a: Pt = [c[0] - ((c[0] - p[0]) / l1) * r, c[1] - ((c[1] - p[1]) / l1) * r];
    const b: Pt = [c[0] + ((n[0] - c[0]) / l2) * r, c[1] + ((n[1] - c[1]) / l2) * r];
    d += ` L ${a[0]} ${a[1]} Q ${c[0]} ${c[1]} ${b[0]} ${b[1]}`;
  }
  const last = pts[pts.length - 1];
  d += ` L ${last[0]} ${last[1]}`;
  // midpoint by length
  let len = 0;
  for (let k = 1; k < pts.length; k++) len += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
  let at = len / 2, mid: Pt = pts[0];
  for (let k = 1; k < pts.length; k++) {
    const seg = Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
    if (at <= seg) { const t = seg ? at / seg : 0; mid = [pts[k - 1][0] + (pts[k][0] - pts[k - 1][0]) * t, pts[k - 1][1] + (pts[k][1] - pts[k - 1][1]) * t]; break; }
    at -= seg;
  }
  // Labels sit on the longest horizontal run (room for the text), else halfway along.
  let label = mid, best = 60;
  for (let k = 0; k < pts.length - 1; k++) {
    const l = pts[k + 1][0] - pts[k][0];
    if (pts[k][1] === pts[k + 1][1] && Math.abs(l) > best) { best = Math.abs(l); label = [(pts[k][0] + pts[k + 1][0]) / 2, pts[k][1]]; }
  }
  return { d, mid, label };
}
