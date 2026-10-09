"use client";

import { useEffect, useMemo } from "react";
import { X } from "lucide-react";
import type { DesignDoc } from "@/lib/doc";
import { LEVELS, TEMPLATES, type Template } from "@/lib/templates";

const cache = new Map<string, DesignDoc>();
const docOf = (t: Template) => { let d = cache.get(t.id); if (!d) { d = t.doc(); cache.set(t.id, d); } return d; };

/** A small drawing of the design's layout: a box per service, a line per link. */
function Preview({ doc }: { doc: DesignDoc }) {
  const g = useMemo(() => {
    const abs = new Map<string, { x: number; y: number; w: number; h: number; host: boolean }>();
    const byId = new Map(doc.nodes.map((n) => [n.id, n]));
    const pos = (id: string): { x: number; y: number } => { const n = byId.get(id)!; const p = n.parent ? pos(n.parent) : { x: 0, y: 0 }; return { x: p.x + n.x, y: p.y + n.y }; };
    for (const n of doc.nodes) {
      const host = n.type === "vps" || n.type === "container";
      abs.set(n.id, { ...pos(n.id), w: host ? (n.width ?? (n.type === "vps" ? 520 : 300)) : 142, h: host ? (n.height ?? (n.type === "vps" ? 320 : 190)) : 64, host });
    }
    const all = [...abs.values()];
    const x0 = Math.min(...all.map((b) => b.x)), y0 = Math.min(...all.map((b) => b.y));
    const w = Math.max(...all.map((b) => b.x + b.w)) - x0, h = Math.max(...all.map((b) => b.y + b.h)) - y0;
    return { abs, x0, y0, w, h };
  }, [doc]);
  const pad = 20;
  return (
    <svg className="tpl-prev" viewBox={`${-pad} ${-pad} ${g.w + pad * 2} ${g.h + pad * 2}`} preserveAspectRatio="xMidYMid meet" aria-hidden>
      {[...g.abs.entries()].filter(([, b]) => b.host).map(([id, b]) => <rect key={id} className="hostbox" x={b.x - g.x0} y={b.y - g.y0} width={b.w} height={b.h} rx={22} />)}
      {doc.edges.map((e) => {
        const a = g.abs.get(e.from), b = g.abs.get(e.to);
        if (!a || !b) return null;
        const x1 = a.x - g.x0 + a.w, y1 = a.y - g.y0 + a.h / 2, x2 = b.x - g.x0, y2 = b.y - g.y0 + b.h / 2, mx = (x1 + x2) / 2;
        return <path key={e.id} className="link" d={`M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`} />;
      })}
      {[...g.abs.entries()].filter(([, b]) => !b.host).map(([id, b]) => <rect key={id} className="nodebox" x={b.x - g.x0} y={b.y - g.y0} width={b.w} height={b.h} rx={14} />)}
    </svg>
  );
}

/** Every template, grouped Easy / Medium / Complex. `onPick` decides what choosing one does. */
export function TemplateGallery({ onPick }: { onPick: (t: Template) => void }) {
  return (
    <div className="tpl-gallery">
      {LEVELS.map((lv) => (
        <section key={lv.id} aria-label={lv.label}>
          <h3 className="tpl-lv"><span>{lv.label}</span><small>{lv.sub}</small></h3>
          <div className="tpl-grid">
            {TEMPLATES.filter((t) => t.level === lv.id).map((t) => {
              const doc = docOf(t);
              return (
                <button key={t.id} className="tpl" onClick={() => onPick(t)}>
                  <Preview doc={doc} />
                  <b>{t.title}</b>
                  <span className="tpl-blurb">{t.blurb}</span>
                  <small>{doc.nodes.length} parts · {doc.workload.rps.toLocaleString("en-US")} requests/s</small>
                  <ul>{t.learn.map((l) => <li key={l}>{l}</li>)}</ul>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

/** The gallery in a window over the canvas. */
export function TemplateDialog({ onPick, onClose }: { onPick: (t: Template) => void; onClose: () => void }) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [onClose]);
  return (
    <div className="tpl-scrim" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="tpl-dialog" role="dialog" aria-modal="true" aria-label="Start from a template">
        <header><div><h2>Start from a template</h2><p>Each one is a working design with real prices. Change the traffic and watch what breaks.</p></div>
          <button className="ib" aria-label="Close" onClick={onClose}><X className="ic" size={17} aria-hidden /></button></header>
        <TemplateGallery onPick={onPick} />
      </div>
    </div>
  );
}
