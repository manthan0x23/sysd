"use client";

import { useEffect } from "react";
import { LayoutGrid, PanelRight } from "lucide-react";
import { ReactFlowProvider, useReactFlow } from "@xyflow/react";
import { startHistory, useStudio, useStudio as useStore, type InitialDesign } from "@/store/useStudio";
import { BreakdownDock } from "./BreakdownDock";
import { TopIsland } from "./TopIsland";
import { UtilityIsland } from "./UtilityIsland";
import { Canvas } from "./Canvas";
import { Palette } from "./Palette";
import { StudioSkeleton } from "./StudioSkeleton";
import { LinkNotice, OptimizeToast, UndoToast } from "./UndoToast";
import { Panel } from "./panel/Panel";
import { useAutosave } from "./useAutosave";
import { RequestSim } from "./RequestSim";
import { TemplateGallery } from "./TemplateGallery";
import { useShortcuts } from "./useShortcuts";

export interface StudioUser { name: string; avatar: string | null }

/** A blank canvas offers ready-made designs to start from, easy to complex. */
function EmptyHint() {
  const empty = useStore((s) => s.nodes.length === 0);
  const readOnly = useStore((s) => s.design.shared || s.design.level === "view");
  const { fitView } = useReactFlow();
  if (!empty || readOnly) return null;
  return (
    <div className="empty-hint" role="region" aria-label="Start from a template">
      <h2>Start from a template</h2>
      <p>Pick a working design to explore, or drag a service from the left (start with a <b>Client</b>) to build your own.</p>
      <TemplateGallery onPick={(t) => { useStore.getState().applyDoc(t.doc(), t.title); setTimeout(() => void fitView({ duration: 400, padding: 0.2 }), 80); }} />
      <button className="pill-btn" onClick={() => useStore.getState().loadSample()}>Or load the small sample system</button>
    </div>
  );
}

/**
 * `hydrateKey` identifies which design should be on screen. The canvas waits until the store holds that
 * design, so a saved design never flashes the sample graph first.
 */
export function Studio({ user, plan, initial, hydrateKey, shareToken }: { user: StudioUser; plan: "free" | "pro"; initial: InitialDesign | null; hydrateKey: string; shareToken?: string }) {
  const ready = useStudio((s) => s.design.key === hydrateKey);
  useEffect(() => { useStudio.getState().hydrate(hydrateKey, initial); }, [hydrateKey, initial]);
  const { dirty } = useAutosave();
  const ui = useStudio((s) => s.ui);
  // Remember which surfaces were folded, per browser.
  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem("sysd.ui") ?? "null"); if (saved) for (const k of ["left", "right", "util"] as const) if (typeof saved[k] === "boolean") useStudio.getState().setUi(k, saved[k]); } catch { /* storage unavailable */ }
    return useStudio.subscribe((st, prev) => { if (st.ui !== prev.ui) try { localStorage.setItem("sysd.ui", JSON.stringify(st.ui)); } catch { /* storage unavailable */ } });
  }, []);
  const readOnly = useStudio((s) => s.design.shared || s.design.level === "view");
  useShortcuts(readOnly);
  useEffect(() => startHistory(), []);

  if (!ready) return <StudioSkeleton />;
  return (
    <ReactFlowProvider>
      <div className={`studio ${readOnly ? "readonly" : ""} ${ui.left ? "" : "no-left"} ${ui.right ? "" : "no-right"}`}>
        <Canvas readOnly={readOnly} />
        <TopIsland user={user} plan={plan} dirty={dirty} shareToken={shareToken} />
        <UtilityIsland plan={plan} />
        <EmptyHint />
        {!readOnly && <Palette />}
        {!readOnly && !ui.left && <button className="island fab fab-left" title="Open the component list" aria-label="Open the component list" onClick={() => useStudio.getState().setUi("left", true)}><LayoutGrid className="ic" size={18} aria-hidden /></button>}
        <Panel />
        {!ui.right && <button className="island fab fab-right" title="Open details and numbers" aria-label="Open details and numbers" onClick={() => useStudio.getState().setUi("right", true)}><PanelRight className="ic" size={18} aria-hidden /></button>}
        <BreakdownDock plan={plan} />
        <RequestSim />
        {!readOnly && <UndoToast />}
        {!readOnly && <LinkNotice />}
        {!readOnly && <OptimizeToast />}
      </div>
    </ReactFlowProvider>
  );
}
