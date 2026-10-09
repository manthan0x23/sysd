"use client";

import { useEffect, useMemo, useRef } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, X } from "lucide-react";
import { TYPE_BY_ID } from "@/lib/catalog";
import { TRACE_KINDS, entryLinks, traceRequest, type TraceKind, type TraceStep } from "@/lib/trace";
import { useStudio } from "@/store/useStudio";
import { useAnalysis } from "./useAnalysis";

const PHASE: Record<TraceStep["phase"], string> = { request: "Going in", response: "Coming back", async: "In the background", push: "Pushed to the user" };
const SPEEDS = [0.5, 1, 2];
/** How long one step takes on screen at normal speed. */
const STEP_MS = 1100;

/**
 * Follows one request through the design, one hop at a time. The trace itself comes from src/lib/trace.ts; this walks
 * it, lights up the node and link the request is on, and says in words what is happening and why.
 */
export function RequestSim() {
  const req = useStudio((s) => s.req);
  const a = useAnalysis();
  const list = useRef<HTMLOListElement>(null);
  const kind: TraceKind = req?.kind ?? "read-miss";
  const entries = useMemo(() => entryLinks(a.nodes, a.edges), [a.nodes, a.edges]);
  const trace = useMemo(() => traceRequest(a.nodes, a.edges, a.sim, kind, req?.entry), [a.nodes, a.edges, a.sim, kind, req?.entry]);
  const nm = (id: string) => { const n = a.nodes.find((x) => x.id === id); return n ? n.data.name || TYPE_BY_ID[n.data.typeId]?.short || TYPE_BY_ID[n.data.typeId]?.label || id : id; };
  const total = trace.steps.length;
  const step = req ? Math.min(req.step, Math.max(0, total - 1)) : 0;
  const cur = trace.steps[step];
  const playing = Boolean(req?.playing);
  const speed = req?.speed ?? 1;

  // Walk forward while playing.
  useEffect(() => {
    if (!req || !playing || !total) return;
    const t = setTimeout(() => {
      const { req: now, setReq } = useStudio.getState();
      if (!now) return;
      if (now.step >= total - 1) setReq({ playing: false });
      else setReq({ step: now.step + 1 });
    }, STEP_MS / speed);
    return () => clearTimeout(t);
  }, [req, playing, step, total, speed]);

  // Tell the canvas what to light up.
  useEffect(() => {
    if (!req || !cur) { useStudio.getState().setReqFocus(null); return; }
    const walked = trace.steps.slice(0, step).flatMap((s) => (s.edgeId ? [s.edgeId] : []));
    useStudio.getState().setReqFocus({ key: Date.now(), edgeId: cur.edgeId, reverse: cur.reverse, nodes: cur.from === cur.to ? [cur.from] : [cur.from, cur.to], walked, ms: (STEP_MS / speed) * 0.85 });
  }, [req, cur, step, speed, trace]);
  useEffect(() => () => useStudio.getState().setReqFocus(null), []);
  // Keep the current row in view.
  useEffect(() => { list.current?.querySelector('[aria-current="step"]')?.scrollIntoView({ block: "nearest" }); }, [step]);

  if (!req) return null;
  const { setReq } = useStudio.getState();
  const go = (n: number) => setReq({ step: Math.max(0, Math.min(total - 1, n)), playing: false });
  const restart = () => setReq({ step: 0, playing: true });
  const togglePlay = () => (playing ? setReq({ playing: false }) : step >= total - 1 ? restart() : setReq({ playing: true }));
  const pick = (k: TraceKind) => setReq({ kind: k, step: 0, playing: true });
  const entryName = (e: { from: string; to: string }) => `${nm(e.from)} → ${nm(e.to)}`;

  return (
    <aside className="island req" aria-label="Request simulator">
      <header className="req-h">
        <div>
          <h3>Follow one request</h3>
          <p>{TRACE_KINDS.find((k) => k.id === kind)?.sub}</p>
        </div>
        <button className="ib" title="Close (Esc)" aria-label="Close the simulator" onClick={() => setReq(null)}><X className="ic" size={16} aria-hidden /></button>
      </header>
      <div className="req-kinds" role="tablist" aria-label="Kind of request">
        {TRACE_KINDS.map((k) => (
          <button key={k.id} role="tab" aria-selected={kind === k.id} className={`chipbtn ${kind === k.id ? "on" : ""}`} onClick={() => pick(k.id)}>{k.label}</button>
        ))}
        {entries.length > 1 && (
          <select className="req-entry" aria-label="Where the request starts" value={req.entry ?? ""} onChange={(e) => setReq({ entry: e.target.value || undefined, step: 0, playing: true })}>
            <option value="">Start: automatic</option>
            {entries.map((e) => <option key={e.edgeId} value={e.edgeId}>Start: {entryName(e)}</option>)}
          </select>
        )}
      </div>

      {cur ? (
        <>
          <div className={`req-card ${cur.phase}`} key={step} aria-live="polite">
            <div className="req-meta"><span className="req-phase">{PHASE[cur.phase]}</span><span>Step {step + 1} of {total}</span><span>{cur.at} ms in</span></div>
            <h4>{cur.title}</h4>
            <p>{cur.why}</p>
          </div>
          <div className="req-ctl">
            <button className="ib" title="Previous step" aria-label="Previous step" disabled={step === 0} onClick={() => go(step - 1)}><ChevronLeft className="ic" size={17} aria-hidden /></button>
            <button className="ib play" title={playing ? "Pause" : "Play"} aria-label={playing ? "Pause" : "Play"} onClick={togglePlay}>{playing ? <Pause className="ic" size={17} aria-hidden /> : <Play className="ic" size={17} aria-hidden />}</button>
            <button className="ib" title="Next step" aria-label="Next step" disabled={step >= total - 1} onClick={() => go(step + 1)}><ChevronRight className="ic" size={17} aria-hidden /></button>
            <button className="ib" title="Start again" aria-label="Start again" onClick={restart}><RotateCcw className="ic" size={15} aria-hidden /></button>
            <input className="req-scrub" type="range" min={0} max={Math.max(0, total - 1)} value={step} aria-label="Step" onChange={(e) => go(Number(e.target.value))} />
            <div className="req-speed" role="group" aria-label="Speed">
              {SPEEDS.map((x) => <button key={x} className={`chipbtn ${speed === x ? "on" : ""}`} onClick={() => setReq({ speed: x })}>{x}×</button>)}
            </div>
          </div>
          <p className="req-sum">
            The user waits <b>{trace.answerMs} ms</b> for the answer{trace.backgroundMs != null && <>; background work finishes at <b>{trace.backgroundMs} ms</b></>}.
            <small> Times are illustrative and grow as a node gets busy.</small>
          </p>
          <details className="req-all">
          <summary>All {total} steps</summary>
          <ol className="req-list" ref={list}>
            {trace.steps.map((s, i) => (
              <li key={i}><button className={`req-row ${s.phase}`} aria-current={i === step ? "step" : undefined} onClick={() => go(i)}><i>{i + 1}</i><span>{s.title}</span><em>{s.at} ms</em></button></li>
            ))}
          </ol>
          </details>
        </>
      ) : <p className="req-empty">{trace.notes[0] ?? "Nothing to follow yet."}</p>}
      {trace.notes.length > 0 && cur && <ul className="req-notes">{trace.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
    </aside>
  );
}
