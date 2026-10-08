"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useReactFlow } from "@xyflow/react";
import { CATEGORIES, COUNTS, TYPE_BY_ID, offeringsOf, searchTypes } from "@/lib/catalog";
import { ServiceIcon } from "./ServiceIcon";
import { useStudio } from "@/store/useStudio";

export const DRAG_TYPE = "application/x-studio-kind";

const GAP = 22;
const SIZE = { node: { w: 142, h: 64 }, server: { w: 520, h: 320 }, container: { w: 300, h: 190 } };

/** Walks outward from the origin on a grid until the new block would not overlap an existing one. */
function freeSpot(
  nodes: { position: { x: number; y: number }; parentId?: string; style?: { width?: unknown; height?: unknown } }[],
  origin: { x: number; y: number },
  size: { w: number; h: number },
) {
  const boxes = nodes.filter((n) => !n.parentId).map((n) => ({
    x: n.position.x, y: n.position.y,
    w: typeof n.style?.width === "number" ? n.style.width : SIZE.node.w, h: typeof n.style?.height === "number" ? n.style.height : SIZE.node.h,
  }));
  const free = (x: number, y: number) => boxes.every((b) => x + size.w + GAP <= b.x || b.x + b.w + GAP <= x || y + size.h + GAP <= b.y || b.y + b.h + GAP <= y);
  const stepX = Math.max(60, size.w / 2), stepY = Math.max(40, size.h / 2);
  for (let ring = 0; ring < 14; ring++) {
    for (let dx = -ring; dx <= ring; dx++) {
      for (let dy = -ring; dy <= ring; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
        const x = Math.round((origin.x + dx * stepX) / 11) * 11;
        const y = Math.round((origin.y + dy * stepY) / 11) * 11;
        if (free(x, y)) return { x, y };
      }
    }
  }
  return origin;
}

export function Palette() {
  const [q, setQ] = useState("");
  const addNode = useStudio((s) => s.addNode);
  const { screenToFlowPosition } = useReactFlow();
  const results = useMemo(() => searchTypes(q), [q]);
  const searching = q.trim().length > 0;

  const addAtCenter = (typeId: string) => {
    const host = TYPE_BY_ID[typeId].host;
    const size = host ? SIZE[host] : SIZE.node;
    const origin = screenToFlowPosition({ x: window.innerWidth / 2 - size.w / 2, y: window.innerHeight / 2 - size.h / 2 });
    addNode(typeId, freeSpot(useStudio.getState().nodes, origin, size));
  };

  return (
    <aside className="panel left" aria-label="Components">
      <div className="search">
        <Search className="ic" size={15} aria-hidden />
        <input placeholder="Search services" aria-label="Search services or providers" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <p className="note" style={{ margin: "8px 2px 0" }}>{COUNTS.types} services · {COUNTS.offerings} provider options</p>
      {CATEGORIES.map((cat, i) => {
        const items = results.filter((r) => r.type.category === cat);
        if (!items.length) return null;
        return (
          <details key={`${cat}-${searching}`} className="cat" open={searching || i < 3}>
            <summary>{cat}<span>{items.length}</span></summary>
            {items.map(({ type, via }) => (
              <button
                key={type.id} className="pi" draggable
                onDragStart={(e) => { e.dataTransfer.setData(DRAG_TYPE, type.id); e.dataTransfer.effectAllowed = "move"; }}
                onClick={() => addAtCenter(type.id)}
                title={`Drag onto the canvas, or click to add. ${offeringsOf(type.id).length} providers.`}
              >
                <ServiceIcon typeId={type.id} />
                <span className="pt">{type.label}{via && <small>via {via}</small>}</span>
              </button>
            ))}
          </details>
        );
      })}
      {!results.length && <p className="empty">Nothing matches “{q}”.</p>}
    </aside>
  );
}
