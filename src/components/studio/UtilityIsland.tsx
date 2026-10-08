"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useReactFlow } from "@xyflow/react";
import { BarChart3, ChevronDown, Crown, Download, FilePen, FilePlus2, Home, Lock, Maximize, Menu as MenuIcon, Minus, Plus, RotateCcw, Save } from "lucide-react";
import { fmtMoney } from "@/lib/format";
import { EXPORTS, exportDesign, type ExportFormat } from "@/lib/exportClient";
import { useStudio } from "@/store/useStudio";
import { Num } from "./Num";
import { ThemeToggle } from "./ThemeToggle";
import { useAnalysis } from "./useAnalysis";
import { saveNow } from "./useAutosave";

const stamp = () => Date.now().toString(36);

/** A button that opens a small menu above the island. */
function Menu({ label, icon, children, wide, width }: { label: string; icon: ReactNode; children: (close: () => void) => ReactNode; wide?: boolean; width?: number }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", down); document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", down); document.removeEventListener("keydown", key); };
  }, [open]);
  return (
    <div className="menu" ref={box}>
      <button className={`ib ${wide ? "wide" : ""}`} title={label} aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>{icon}{wide && <span>{label}</span>}</button>
      {open && <div className="menu-pop" role="menu" style={width ? { width } : undefined}>{children(() => setOpen(false))}</div>}
    </div>
  );
}

export function UtilityIsland({ plan }: { plan: "free" | "pro" }) {
  const router = useRouter();
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const a = useAnalysis();
  const mode = useStudio((s) => s.mode);
  const setMode = useStudio((s) => s.setMode);
  const dockOpen = useStudio((s) => s.dockOpen);
  const setDock = useStudio((s) => s.setDock);
  const design = useStudio((s) => s.design);
  const reset = useStudio((s) => s.reset);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const open = useStudio((s) => s.ui.util);
  const readOnly = design.shared || design.level === "view";
  const isNew = !design.id && !design.shared;
  const pro = plan === "pro";

  const doExport = async (f: ExportFormat, close: () => void) => {
    setExporting(f); setExportError(null);
    const r = await exportDesign(f);
    setExporting(null);
    if (r.ok) close(); else setExportError(r.error);
  };

  if (!open) return <button className="island fab fab-bottom" title="Open the tools" aria-label="Open the tools" onClick={() => useStudio.getState().setUi("util", true)}><MenuIcon className="ic" size={18} aria-hidden /></button>;
  return (
    <div className="island util-island" role="toolbar" aria-label="Canvas tools">
      <button className="ib fold" title="Fold into an icon" aria-label="Fold the tools into an icon" onClick={() => useStudio.getState().setUi("util", false)}><ChevronDown className="ic" size={16} aria-hidden /></button>
      <i className="sep" aria-hidden />
      <Link href="/home" className="ib" title="Home: all your designs" aria-label="Home"><Home className="ic" size={17} aria-hidden /></Link>
      <Menu label="New design" icon={<FilePlus2 className="ic" size={17} aria-hidden />}>
        {(close) => (
          <>
            <button role="menuitem" className="mi" onClick={() => { close(); router.push(`/app?start=blank&fresh=${stamp()}`); }}><b>Blank canvas</b><small>Start from nothing</small></button>
            <button role="menuitem" className="mi" onClick={() => { close(); router.push(`/app?fresh=${stamp()}`); }}><b>Sample system</b><small>A web app with a cache, database and queue</small></button>
          </>
        )}
      </Menu>
      {!readOnly && (
        <>
          <button className="ib" title="Save as a draft" aria-label="Save draft" onClick={() => void saveNow("draft")}><FilePen className="ic" size={17} aria-hidden /></button>
          <button className="ib" title="Save (Ctrl+S)" aria-label="Save" onClick={() => void saveNow("saved")}><Save className="ic" size={17} aria-hidden /></button>
        </>
      )}
      <i className="sep" aria-hidden />
      <button className="ib" title="Zoom out" aria-label="Zoom out" onClick={() => void zoomOut({ duration: 200 })}><Minus className="ic" size={16} aria-hidden /></button>
      <button className="ib" title="Zoom in" aria-label="Zoom in" onClick={() => void zoomIn({ duration: 200 })}><Plus className="ic" size={16} aria-hidden /></button>
      <button className="ib" title="Fit everything on screen" aria-label="Fit to screen" onClick={() => void fitView({ duration: 300, padding: 0.2 })}><Maximize className="ic" size={16} aria-hidden /></button>
      <i className="sep" aria-hidden />
      <button className="switch" role="switch" aria-checked={mode === "learn"} onClick={() => setMode(mode === "learn" ? "design" : "learn")} title="Show or hide the load bars and requests per second on the canvas">
        <span className="knob" aria-hidden /><span className="lbl2">Show load</span>
      </button>
      <button className={`ib wide ${dockOpen ? "on" : ""}`} aria-pressed={dockOpen} title="Cost and traffic breakdown" onClick={() => setDock(!dockOpen)}>
        <BarChart3 className="ic" size={16} aria-hidden /><span>Breakdown <b><Num value={a.sim.cost} format={fmtMoney} />/mo</b></span>
      </button>
      <i className="sep" aria-hidden />
      <Menu label="Export" icon={<Download className="ic" size={17} aria-hidden />} width={330}>
        {(close) => (
          <>
            <p className="menu-h">{pro ? "Download this design" : <><Lock className="ic" size={13} aria-hidden /> Exports are part of Pro</>}</p>
            {EXPORTS.map((x) => (
              <button key={x.id} role="menuitem" className="mi" disabled={!pro || exporting != null} onClick={() => void doExport(x.id, close)}>
                <b>{x.label}{exporting === x.id ? "…" : ""}</b><small>{x.sub}</small>
              </button>
            ))}
            {exportError && <p className="note err" role="alert">{exportError}</p>}
            {!pro && <Link className="menu-up" href="/upgrade">See what Pro includes</Link>}
          </>
        )}
      </Menu>
      {isNew && <button className="ib" title="Reset to the sample" aria-label="Reset to the sample system" onClick={reset}><RotateCcw className="ic" size={16} aria-hidden /></button>}
      <ThemeToggle />
      {!pro && <Link href="/upgrade" className="ib crown" title="Upgrade to Pro" aria-label="Upgrade to Pro"><Crown className="ic" size={16} aria-hidden /></Link>}
    </div>
  );
}
