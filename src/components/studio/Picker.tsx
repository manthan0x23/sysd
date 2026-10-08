"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

export type Tone = "best" | "good" | "pricey" | "priciest" | "muted" | "ok" | "warn";

export interface PickerOption {
  id: string;
  title: string;
  /** One line of facts under the title, e.g. list prices. */
  sub?: string;
  icon?: ReactNode;
  /** Right-aligned figure, e.g. the monthly estimate. */
  trailing?: string;
  badge?: { label: string; tone: Tone };
  group?: string;
}

interface Props {
  label: string;
  value: string;
  options: PickerOption[];
  onChange: (id: string) => void;
  /** Shown at the bottom of the list, e.g. a note on how options are ranked. */
  footer?: ReactNode;
}

const MAX_H = 360;

/** A listbox that matches the rest of the UI and can show prices, badges and logos per option. */
export function Picker({ label, value, options, onChange, footer }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number; width: number; maxH: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const id = useId();
  const selected = options.find((o) => o.id === value) ?? options[0];

  const close = useCallback(() => { setOpen(false); btn.current?.focus(); }, []);

  useLayoutEffect(() => {
    if (!open || !btn.current) return;
    const r = btn.current.getBoundingClientRect();
    const width = Math.min(Math.max(r.width, 360), window.innerWidth - 24);
    const left = Math.min(Math.max(12, r.left + r.width - width), window.innerWidth - width - 12);
    const below = window.innerHeight - r.bottom - 16;
    const above = r.top - 16;
    if (below >= 220 || below >= above) setPos({ left, top: r.bottom + 6, width, maxH: Math.min(MAX_H, below) });
    else setPos({ left, bottom: window.innerHeight - r.top + 6, width, maxH: Math.min(MAX_H, above) });
  }, [open]);

  const openList = useCallback(() => {
    setActive(Math.max(0, options.findIndex((o) => o.id === value)));
    setOpen(true);
  }, [options, value]);

  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => { if (!list.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setOpen(false); };
    const away = (e: Event) => { if (!list.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", down);
    window.addEventListener("resize", away);
    window.addEventListener("scroll", away, true);
    return () => { document.removeEventListener("pointerdown", down); window.removeEventListener("resize", away); window.removeEventListener("scroll", away, true); };
  }, [open]);

  useEffect(() => { if (open) list.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" }); }, [active, open, pos]);

  const onKey = (e: React.KeyboardEvent) => {
    if (!open) { if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) { e.preventDefault(); openList(); } return; }
    if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(options.length - 1, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    else if (e.key === "Home") { e.preventDefault(); setActive(0); }
    else if (e.key === "End") { e.preventDefault(); setActive(options.length - 1); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onChange(options[active].id); close(); }
    else if (e.key === "Tab") setOpen(false);
  };

  return (
    <div className="picker">
      <button
        ref={btn} type="button" className="pk-btn" aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? id : undefined} aria-label={label}
        onClick={() => (open ? setOpen(false) : openList())} onKeyDown={onKey}
      >
        {selected?.icon}
        <span className="pk-text">
          <b>{selected?.title}</b>
          <span className="pk-sub">
            {selected?.sub && <small>{selected.sub}</small>}
            {selected?.badge && <span className={`tag-chip ${selected.badge.tone}`}>{selected.badge.label}</span>}
          </span>
        </span>
        <ChevronDown className="ic pk-chev" size={16} aria-hidden />
      </button>
      {open && pos && createPortal(
        <div
          ref={list} id={id} role="listbox" aria-label={label} className="pk-pop" onKeyDown={onKey} tabIndex={-1}
          style={{ left: pos.left, width: pos.width, maxHeight: pos.maxH, top: pos.top, bottom: pos.bottom, transformOrigin: pos.top != null ? "top" : "bottom" }}
        >
          {options.map((o, i) => {
            const header = o.group && o.group !== options[i - 1]?.group ? <div className="pk-group" key={`g-${o.group}`}>{o.group}</div> : null;
            return (
              <div key={o.id} style={{ display: "contents" }}>
                {header}
                <div
                  role="option" aria-selected={o.id === value} data-i={i} className={`pk-opt ${i === active ? "active" : ""} ${o.id === value ? "sel" : ""}`}
                  onPointerMove={() => setActive(i)} onClick={() => { onChange(o.id); close(); }}
                >
                  {o.icon}
                  <span className="pk-text">
                    <b>{o.title}</b>
                    {o.sub && <small>{o.sub}</small>}
                  </span>
                  <span className="pk-right">
                    {o.trailing && <b className="pk-cost">{o.trailing}</b>}
                    {o.badge && <span className={`tag-chip ${o.badge.tone}`}>{o.badge.label}</span>}
                  </span>
                  {o.id === value && <Check className="ic pk-check" size={14} aria-hidden />}
                </div>
              </div>
            );
          })}
          {footer && <div className="pk-foot">{footer}</div>}
        </div>,
        document.body,
      )}
    </div>
  );
}
