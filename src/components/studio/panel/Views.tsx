"use client";

import { BUCKETS, TYPE_BY_ID, offeringLabel } from "@/lib/catalog";
import { fmtCompact, fmtInt, fmtMoney, fmtPct, fmtUnit } from "@/lib/format";
import { needOf, offeringOf } from "@/lib/model";
import { splitFor, type SplitMode } from "@/lib/sim";
import { useStudio } from "@/store/useStudio";
import { LogSlider } from "../LogSlider";
import { Num } from "../Num";
import { ServiceIcon } from "../ServiceIcon";
import { useAnalysis } from "../useAnalysis";
import { nameOf } from "./names";
import { TIP } from "./Overview";

export function InputsView() {
  const w = useStudio((s) => s.workload);
  const { setWorkload } = useStudio.getState();
  return (
    <div className="view-body">
      <LogSlider label="Users" value={w.users} min={100} max={50_000_000} format={fmtCompact} onChange={(users) => setWorkload({ users })} />
      <LogSlider label="Requests per second" value={w.rps} min={1} max={200_000} format={fmtInt} onChange={(rps) => setWorkload({ rps, peakRps: Math.max(w.peakRps, rps) })} />
      <LogSlider label="Peak requests per second" value={w.peakRps} min={1} max={1_000_000} format={fmtInt} onChange={(peakRps) => setWorkload({ peakRps, rps: Math.min(w.rps, peakRps) })} />
      <LogSlider label="Data stored" value={w.dataGb} min={1} max={100_000} format={(n) => (n >= 1000 ? `${+(n / 1000).toPrecision(3)} TB` : `${fmtInt(n)} GB`)} onChange={(dataGb) => setWorkload({ dataGb })} />
      <LogSlider label="Read share" value={w.readPct} min={50} max={99} log={false} format={(n) => `${n} : ${100 - n}`} onChange={(readPct) => setWorkload({ readPct })} />
      <label className="check"><input type="checkbox" checked={w.atPeak} onChange={(e) => setWorkload({ atPeak: e.target.checked })} />Simulate at peak</label>
      <p className="note">Requests per second is what the whole system receives. Every component below gets its share, which you can follow in Traffic.</p>
    </div>
  );
}

const MODE_TEXT: Record<SplitMode, string> = {
  single: "one link, takes everything",
  even: "split evenly",
  "cache-db": "reads to the cache, misses and writes to the database",
  manual: "shares set by you",
};

export function TrafficView() {
  const a = useAnalysis();
  const selectedEdge = useStudio((s) => s.selectedEdgeId);
  const { selectEdge } = useStudio.getState();
  const byId = new Map(a.nodes.map((n) => [n.id, n]));
  const entry = a.sim.entryRps || 1;
  const roleOf = (id: string) => TYPE_BY_ID[byId.get(id)!.data.typeId].role;

  const rows = a.edges
    .filter((e) => byId.has(e.source) && byId.has(e.target))
    .map((e) => ({ e, load: a.sim.edgeLoad[e.id] ?? 0 }))
    .sort((x, y) => y.load - x.load);

  const fanouts = a.nodes
    .map((n) => ({ n, out: a.edges.filter((e) => e.source === n.id && byId.has(e.target)) }))
    .filter((x) => x.out.length > 1)
    .map((x) => ({ ...x, ...splitFor(x.out, roleOf, a.workload.readPct) }));

  return (
    <div className="view-body">
      <p className="note"><b><Num value={a.sim.entryRps} format={fmtInt} /></b> requests per second enter at the client. Each link below carries part of that; click one to change its share.</p>
      <ul className="rows">
        {rows.map(({ e, load }) => (
          <li key={e.id}>
            <button className={`row ${selectedEdge === e.id ? "on" : ""}`} onClick={() => selectEdge(e.id)}>
              <span className="row-t">{nameOf(byId.get(e.source)!)} <span aria-hidden>→</span> {nameOf(byId.get(e.target)!)}</span>
              <span className="row-n"><Num value={load} format={fmtInt} /> <small>{fmtPct(load / entry)}</small></span>
              <span className="bar"><i style={{ width: `${Math.min(100, (load / entry) * 100)}%` }} /></span>
            </button>
          </li>
        ))}
        {!rows.length && <li className="note">No links yet. Drag from one node&apos;s edge to another to connect them.</li>}
      </ul>
      {fanouts.length > 0 && (
        <>
          <h4>How traffic is divided</h4>
          <ul className="plain">
            {fanouts.map(({ n, out, weights, mode }) => (
              <li key={n.id}><b>{nameOf(n)}</b> sends to {out.length} places: {MODE_TEXT[mode]}. {out.map((e, i) => `${nameOf(byId.get(e.target)!)} ${Math.round(weights[i] * 100)}%`).join(", ")}.</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export function LoadView() {
  const a = useAnalysis();
  const select = useStudio.getState().select;
  const selectedId = useStudio((s) => s.selectedId);
  const rows = a.nodes
    .filter((n) => a.sim.util[n.id] != null)
    .map((n) => ({ n, u: a.sim.util[n.id]!, load: a.sim.load[n.id] ?? 0, cap: TYPE_BY_ID[n.data.typeId].cap ?? 0 }))
    .sort((x, y) => y.u - x.u);
  return (
    <div className="view-body">
      <p className="note">100% is the component&apos;s capacity in requests per second. Capacities are illustrative per service type for now; they do not yet depend on the provider or tier you pick.</p>
      <ul className="rows">
        {rows.map(({ n, u, load, cap }) => (
          <li key={n.id}>
            <button className={`row ${selectedId === n.id ? "on" : ""} ${u >= 0.8 ? "hot" : ""}`} onClick={() => select(n.id)}>
              <span className="row-t"><ServiceIcon typeId={n.data.typeId} offering={offeringOf(n.data)} size={12} className="mini" />{nameOf(n)}</span>
              <span className="row-n"><Num value={u} format={fmtPct} /> <small>{fmtInt(load)} / {fmtInt(cap)}</small></span>
              <span className="bar"><i style={{ width: `${Math.min(100, u * 100)}%` }} /></span>
            </button>
          </li>
        ))}
      </ul>
      <div className="kpis">
        <div className="kpi"><small>Latency</small><b><Num value={a.sim.latencyMs} format={(n) => `${Math.round(n)} ms`} /></b></div>
        <div className={`kpi ${a.sim.errorPct > 0 ? "bad" : ""}`}><small>Errors</small><b><Num value={a.sim.errorPct} format={(n) => `${(n * 100).toFixed(n > 0 ? 1 : 0)}%`} /></b></div>
        <div className="kpi"><small>Headroom</small><b>{a.sim.headroom ? <Num value={a.sim.headroom} format={(n) => `${n.toFixed(1)}×`} /> : "n/a"}</b></div>
      </div>
    </div>
  );
}

export function CostView() {
  const a = useAnalysis();
  const { sim } = a;
  const select = useStudio.getState().select;
  const total = BUCKETS.reduce((s, b) => s + sim.buckets[b], 0) || 1;
  const rows = a.nodes.filter((n) => (sim.nodeCost[n.id] ?? 0) > 0).sort((x, y) => (sim.nodeCost[y.id] ?? 0) - (sim.nodeCost[x.id] ?? 0));
  return (
    <div className="view-body">
      <div className="unit"><Num value={sim.unitCost} format={fmtUnit} /></div>
      <div className="note">per user per month · <Num value={sim.cost} format={(n) => fmtMoney(n)} /> a month in total</div>
      <div className="stack" role="img" aria-label="Cost by bucket">
        {BUCKETS.map((b) => sim.buckets[b] > 0 && <i key={b} className={b === sim.topBucket ? "top" : ""} style={{ flex: sim.buckets[b] / total }} />)}
      </div>
      <div className="legend">
        {BUCKETS.map((b) => (
          <span key={b} style={{ display: "contents" }}>
            <span className={b === sim.topBucket ? "top" : ""}>{b[0].toUpperCase() + b.slice(1)}</span>
            <b><Num value={sim.buckets[b]} format={(n) => fmtMoney(n)} /></b>
          </span>
        ))}
      </div>
      {sim.topBucket && <p className="note"><b>Biggest bucket: {sim.topBucket}.</b> {TIP[sim.topBucket]}</p>}
      <h4>By component</h4>
      <ul className="rows">
        {rows.map((n) => (
          <li key={n.id}>
            <button className="row" onClick={() => select(n.id)}>
              <span className="row-t"><ServiceIcon typeId={n.data.typeId} offering={offeringOf(n.data)} size={12} className="mini" />{nameOf(n)}</span>
              <span className="row-n"><Num value={sim.nodeCost[n.id] ?? 0} format={fmtMoney} /> <small className={sim.priced[n.id] ? "real" : ""}>{sim.priced[n.id] ? "real price" : "illustrative"}</small></span>
            </button>
          </li>
        ))}
      </ul>
      <p className="note">“Real price” comes from a page we fetched, listed under the service with its source. Illustrative figures are placeholders until that service&apos;s prices are loaded.</p>
    </div>
  );
}

export function FitView() {
  const a = useAnalysis();
  const select = useStudio.getState().select;
  const servers = a.nodes.filter((n) => TYPE_BY_ID[n.data.typeId].host === "server");
  if (!servers.length) return <div className="view-body"><p className="note">No servers yet. Add a Server / VPS from the palette and drop services into it to see whether they fit.</p></div>;
  return (
    <div className="view-body">
      {servers.map((s) => {
        const f = a.fits[s.id];
        if (!f) return null;
        const kids = a.nodes.filter((n) => n.parentId === s.id);
        const rows: [string, number, number | undefined, string][] = [
          ["CPU", f.need.cpu, f.have?.cpu, ""], ["RAM", f.need.ramGb, f.have?.ramGb, " GB"], ["Disk", f.need.diskGb, f.have?.diskGb, " GB"],
        ];
        return (
          <section key={s.id} className="card">
            <button className="card-h linkish" onClick={() => select(s.id)}>
              <ServiceIcon typeId={s.data.typeId} offering={offeringOf(s.data)} size={14} />
              <div><h3>{nameOf(s)}</h3><small>{offeringLabel(offeringOf(s.data))} · {f.plan?.label ?? "no plan"}{f.auto ? " (auto)" : ""}</small></div>
              {f.verdict !== "open" && <span className={`tag-chip ${f.verdict === "over" ? "priciest" : f.verdict === "tight" ? "warn" : "ok"}`}>{f.verdict === "over" ? "Does not fit" : f.verdict === "tight" ? "Tight" : "Fits"}</span>}
            </button>
            {rows.map(([label, used, have, unit]) => (
              <div key={label} className={`meter ${have && used / have > 1 ? "over" : have && used / have > 0.8 ? "tight" : ""}`}>
                <div className="mt"><span>{label}</span><b><Num value={used} format={(n) => `${n >= 100 ? Math.round(n) : +n.toFixed(1)}`} />{have != null ? `/${have}${unit}` : unit}</b></div>
                <div className="bar"><i style={{ width: `${have ? Math.min(100, (used / have) * 100) : 0}%` }} /></div>
              </div>
            ))}
            {kids.length > 0 && <p className="note">Holds {kids.map((k) => nameOf(k)).join(", ")}. OS and Docker take {needOf({ cpu: 0.15, ramGb: 0.4, diskGb: 8 })}.</p>}
          </section>
        );
      })}
    </div>
  );
}
