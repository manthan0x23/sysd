import { OFFERING_BY_ID, brandIconId } from "@/lib/catalog";
import { BRAND_ICONS } from "@/lib/catalog/brandIcons.generated";
import type { DesignDoc } from "@/lib/doc";

const CARD = { w: 142, h: 64 };
const HOST_DEFAULT: Record<string, { w: number; h: number }> = { vps: { w: 520, h: 320 }, container: { w: 300, h: 190 } };
const MAX_DETAILED = 150;

/**
 * Draws a preview of a design as an inline SVG string: service tiles with their real icons, server and
 * container blocks, and the links between them. It uses CSS variables, so it follows light and dark mode
 * when placed in the page. No user-written text is drawn, so the output cannot carry markup from a design.
 */
export function renderThumb(doc: DesignDoc): string {
  if (!doc.nodes.length) return "";
  const byId = new Map(doc.nodes.map((n) => [n.id, n]));
  const box = new Map<string, { x: number; y: number; w: number; h: number; depth: number }>();
  const place = (id: string, seen = new Set<string>()): { x: number; y: number; w: number; h: number; depth: number } => {
    const hit = box.get(id); if (hit) return hit;
    const n = byId.get(id)!;
    const host = HOST_DEFAULT[n.type];
    const size = host ? { w: n.width ?? host.w, h: n.height ?? host.h } : CARD;
    const parent = n.parent && byId.has(n.parent) && !seen.has(n.parent) ? place(n.parent, seen.add(id)) : null;
    const b = { x: n.x + (parent?.x ?? 0), y: n.y + (parent?.y ?? 0), ...size, depth: (parent?.depth ?? -1) + 1 };
    box.set(id, b);
    return b;
  };
  for (const n of doc.nodes) place(n.id);

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const b of box.values()) { minX = Math.min(minX, b.x); minY = Math.min(minY, b.y); maxX = Math.max(maxX, b.x + b.w); maxY = Math.max(maxY, b.y + b.h); }
  const pad = 28;
  const vb = `${Math.round(minX - pad)} ${Math.round(minY - pad)} ${Math.round(maxX - minX + pad * 2)} ${Math.round(maxY - minY + pad * 2)}`;
  const detailed = doc.nodes.length <= MAX_DETAILED;
  const f = (v: number) => Math.round(v * 10) / 10;

  const parts: string[] = [];
  // blocks first, outermost first, so inner ones draw on top
  for (const n of [...doc.nodes].filter((x) => HOST_DEFAULT[x.type]).sort((a, b) => box.get(a.id)!.depth - box.get(b.id)!.depth)) {
    const b = box.get(n.id)!;
    const dashed = n.type === "container";
    parts.push(`<rect x="${f(b.x)}" y="${f(b.y)}" width="${f(b.w)}" height="${f(b.h)}" rx="${dashed ? 12 : 16}" fill="var(--ink)" fill-opacity="${dashed ? 0.05 : 0.035}" stroke="var(--ink2)" stroke-opacity="0.55" stroke-width="1.4" vector-effect="non-scaling-stroke"${dashed ? ' stroke-dasharray="5 4"' : ""}/>`);
    if (detailed) parts.push(`<rect x="${f(b.x + 14)}" y="${f(b.y + 14)}" width="${dashed ? 70 : 90}" height="9" rx="4.5" fill="var(--ink)" fill-opacity="0.35"/>`);
  }
  // links
  for (const e of doc.edges) {
    const a = box.get(e.from), t = box.get(e.to);
    if (!a || !t) continue;
    const x1 = a.x + a.w, y1 = a.y + a.h / 2, x2 = t.x, y2 = t.y + t.h / 2;
    const mx = x2 >= x1 ? (x1 + x2) / 2 : x1 + 22;
    const r = Math.min(12, Math.abs(y2 - y1) / 2, Math.abs(mx - x1));
    const s = y2 >= y1 ? 1 : -1;
    const d = Math.abs(y2 - y1) < 1 ? `M${f(x1)} ${f(y1)}H${f(x2)}`
      : `M${f(x1)} ${f(y1)}H${f(mx - r)}Q${f(mx)} ${f(y1)} ${f(mx)} ${f(y1 + s * r)}V${f(y2 - s * r)}Q${f(mx)} ${f(y2)} ${f(mx + r)} ${f(y2)}H${f(x2)}`;
    parts.push(`<path d="${d}" fill="none" stroke="var(--ink2)" stroke-opacity="0.7" stroke-width="1.5" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`);
  }
  // service tiles
  for (const n of doc.nodes) {
    if (HOST_DEFAULT[n.type]) continue;
    const b = box.get(n.id)!;
    parts.push(`<rect x="${f(b.x)}" y="${f(b.y)}" width="${f(b.w)}" height="${f(b.h)}" rx="12" fill="var(--surface)" stroke="var(--ink2)" stroke-opacity="0.5" stroke-width="1.2" vector-effect="non-scaling-stroke"/>`);
    if (!detailed) continue;
    const ix = b.x + 12, iy = b.y + 12;
    parts.push(`<rect x="${f(ix)}" y="${f(iy)}" width="30" height="30" rx="9" fill="#fff" stroke="var(--ink2)" stroke-opacity="0.35" stroke-width="1" vector-effect="non-scaling-stroke"/>`);
    const icon = n.type === "client" ? undefined : BRAND_ICONS[brandIconId(n.type, n.offering ? OFFERING_BY_ID[n.offering] : undefined) ?? ""];
    if (icon) parts.push(`<svg x="${f(ix + 5)}" y="${f(iy + 5)}" width="20" height="20" viewBox="0 0 ${icon.w} ${icon.h}"${icon.mono ? ' fill="#1a1a1a"' : ""}>${icon.body}</svg>`);
    else parts.push(`<rect x="${f(ix + 8)}" y="${f(iy + 9)}" width="14" height="5" rx="2.5" fill="#1a1a1a" fill-opacity="0.55"/><rect x="${f(ix + 8)}" y="${f(iy + 17)}" width="14" height="5" rx="2.5" fill="#1a1a1a" fill-opacity="0.55"/>`);
    parts.push(`<rect x="${f(ix + 40)}" y="${f(iy + 4)}" width="52" height="8" rx="4" fill="var(--ink)" fill-opacity="0.7"/><rect x="${f(ix + 40)}" y="${f(iy + 18)}" width="34" height="6" rx="3" fill="var(--ink)" fill-opacity="0.25"/>`);
    parts.push(`<rect x="${f(b.x + 12)}" y="${f(b.y + b.h - 13)}" width="${f(b.w - 24)}" height="3.5" rx="1.75" fill="var(--ink)" fill-opacity="0.12"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Preview of the design">${parts.join("")}</svg>`;
}
