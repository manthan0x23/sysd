"use client";

import { ArrowLeft, PanelRightClose } from "lucide-react";
import { useStudio, type View } from "@/store/useStudio";
import { Overview } from "./Overview";
import { ComponentCard, LinkEditor } from "./Selection";
import { CostView, FitView, InputsView, LoadView, TrafficView } from "./Views";

const TITLE: Record<View, string> = { overview: "Numbers", inputs: "Inputs", traffic: "Traffic", load: "Load", cost: "Cost", fit: "Fit" };
const HINT: Record<View, string> = {
  overview: "Every number in one place. Open a card to zoom in.",
  inputs: "What the system is asked to handle.",
  traffic: "Where each request goes.",
  load: "How full each component is.",
  cost: "What it costs, and where the money goes.",
  fit: "Whether your services fit on your servers.",
};

export function Panel() {
  const view = useStudio((s) => s.view);
  const setView = useStudio((s) => s.setView);
  const hasNode = useStudio((s) => s.selectedId != null);
  const hasEdge = useStudio((s) => s.selectedEdgeId != null);
  const open = useStudio((s) => s.ui.right);

  return (
    <aside className={`panel right ${open ? "" : "collapsed"}`} aria-label="Details and numbers" inert={!open}>
      <button className="panel-x" title="Fold into an icon" aria-label="Fold the details panel into an icon" onClick={() => useStudio.getState().setUi("right", false)}><PanelRightClose className="ic" size={16} aria-hidden /></button>
      {hasNode && <ComponentCard />}
      {hasEdge && <LinkEditor />}
      <div className="view-h">
        {view !== "overview" && <button className="back" onClick={() => setView("overview")} aria-label="Back to all numbers"><ArrowLeft className="ic" size={15} aria-hidden /></button>}
        <div><h2>{TITLE[view]}</h2>{view !== "overview" && <small>{HINT[view]}</small>}</div>
      </div>
      <div className="view" key={view}>
        {view === "overview" && <Overview />}
        {view === "inputs" && <InputsView />}
        {view === "traffic" && <TrafficView />}
        {view === "load" && <LoadView />}
        {view === "cost" && <CostView />}
        {view === "fit" && <FitView />}
      </div>
    </aside>
  );
}
