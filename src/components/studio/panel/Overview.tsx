"use client";

import { ChevronRight } from "lucide-react";
import { BUCKETS, TYPE_BY_ID } from "@/lib/catalog";
import { fmtCompact, fmtInt, fmtMoney, fmtPct, fmtUnit } from "@/lib/format";
import { useStudio, type View } from "@/store/useStudio";
import { Num } from "../Num";
import { useAnalysis } from "../useAnalysis";
import { nameOf } from "./names";

function Card({ view, title, children }: { view: View; title: string; children: React.ReactNode }) {
  const setView = useStudio((s) => s.setView);
  return (
    <button className="nc" onClick={() => setView(view)} aria-label={`Open ${title}`}>
      <span className="nc-h">{title}<ChevronRight className="ic" size={14} aria-hidden /></span>
      {children}
    </button>
  );
}

/** Every key number in one compact place; each card opens the detail behind it. */
export function Overview() {
  const a = useAnalysis();
  const { sim, why, workload: w } = a;
  const hot = sim.hottestId ? a.nodes.find((n) => n.id === sim.hottestId) : undefined;
  const servers = a.nodes.filter((n) => TYPE_BY_ID[n.data.typeId].host === "server");
  const over = servers.filter((n) => a.fits[n.id]?.verdict === "over").length;
  const links = a.edges.length;
  const busiest = Math.max(0, ...Object.values(sim.edgeLoad));
  const yours = Object.keys(sim.yours).length;
  const real = Object.keys(sim.priced).filter((k) => sim.priced[k] && !sim.yours[k]).length;
  const counted = Object.keys(sim.priced).length;
  const total = BUCKETS.reduce((s, b) => s + sim.buckets[b], 0) || 1;

  return (
    <>
      <div className="ncs">
        <Card view="inputs" title="Inputs">
          <b className="nc-big"><Num value={sim.entryRps || w.rps} format={fmtInt} /><small> req/s</small></b>
          <span className="nc-sub">{fmtCompact(w.users)} users · {w.dataGb >= 1000 ? `${+(w.dataGb / 1000).toPrecision(2)} TB` : `${fmtInt(w.dataGb)} GB`} · {w.readPct}:{100 - w.readPct}{w.atPeak ? " · at peak" : ""}</span>
        </Card>
        <Card view="traffic" title="Traffic">
          <b className="nc-big"><Num value={busiest} format={(n) => fmtInt(n)} /><small> busiest link</small></b>
          <span className="nc-sub">{links} link{links === 1 ? "" : "s"} · {fmtInt(sim.entryRps)} req/s in</span>
        </Card>
        <Card view="load" title="Load">
          <b className="nc-big"><Num value={hot ? (sim.util[hot.id] ?? 0) : 0} format={fmtPct} /><small> {hot ? nameOf(hot) : "idle"}</small></b>
          <span className="nc-sub"><Num value={sim.latencyMs} format={(n) => `${Math.round(n)} ms`} /> · <Num value={sim.errorPct} format={(n) => `${(n * 100).toFixed(n > 0 ? 1 : 0)}% errors`} /> · {sim.headroom ? `${sim.headroom.toFixed(1)}× room` : "n/a"}</span>
        </Card>
        <Card view="cost" title="Cost">
          <b className="nc-big"><Num value={sim.unitCost} format={fmtUnit} /><small> /user/mo</small></b>
          <span className="nc-sub"><Num value={sim.cost} format={fmtMoney} />/mo · mostly {sim.topBucket ?? "n/a"}</span>
          <span className="nc-stack" aria-hidden>{BUCKETS.map((b) => sim.buckets[b] > 0 && <i key={b} className={b === sim.topBucket ? "top" : ""} style={{ flex: sim.buckets[b] / total }} />)}</span>
        </Card>
        <Card view="fit" title="Fit">
          {servers.length ? (
            <>
              <b className="nc-big">{servers.length - over}<small> of {servers.length} server{servers.length === 1 ? "" : "s"} fit</small></b>
              <span className="nc-sub">{over ? `${over} need${over === 1 ? "s" : ""} a bigger plan` : "All within their plans"}</span>
            </>
          ) : (
            <><b className="nc-big">None</b><span className="nc-sub">Add a server to check fit</span></>
          )}
        </Card>
        <div className="nc nc-static" aria-label="Price coverage">
          <span className="nc-h">Price data</span>
          <b className="nc-big">{real + yours}<small> of {counted} real or yours</small></b>
          <span className="nc-sub">{real + yours ? `${real} real price${real === 1 ? "" : "s"}, ${yours} yours. The rest are illustrative` : "All costs are illustrative so far"}</span>
        </div>
      </div>

      <div className="why" key={why.title + why.accent}>
        <h5>{why.title} {why.accent && <em>{why.accent}</em>}</h5>
        <p>{why.body}</p>
        {sim.topBucket && <p className="tip"><b>Biggest cost bucket: {sim.topBucket}.</b> {TIP[sim.topBucket]}</p>}
      </div>
    </>
  );
}

const TIP: Record<string, string> = {
  compute: "Right-size instances and autoscale to the load curve, not the peak.",
  storage: "Tier cold data and dedupe before adding capacity.",
  transfer: "Keep bytes local: cache at the edge and serve users from their nearest region.",
  managed: "Right-size the plan and check whether a smaller tier covers the peak.",
  people: "Operating it yourself costs engineer time. Weigh managed services against that.",
};
export { TIP };
