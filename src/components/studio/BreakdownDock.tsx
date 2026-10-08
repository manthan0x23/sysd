"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Download, Lock, Maximize2, Minimize2 } from "lucide-react";
import { TYPE_BY_ID } from "@/lib/catalog";
import { fmtInt, fmtMoney, fmtUnit } from "@/lib/format";
import { offeringOf } from "@/lib/model";
import { SECONDS_PER_MONTH } from "@/lib/pricing/estimate";
import { exportDesign } from "@/lib/exportClient";
import { useStudio } from "@/store/useStudio";
import { Num } from "./Num";
import { nameOf } from "./panel/names";
import { ServiceIcon } from "./ServiceIcon";
import { useAnalysis } from "./useAnalysis";

type Tab = "cost" | "traffic";
type Key = "name" | "rps" | "traffic" | "util" | "cost" | "share" | "per";

const pct = (n: number) => (n >= 0.995 ? `${Math.round(n * 100)}%` : n >= 0.1 ? `${(n * 100).toFixed(0)}%` : n > 0 ? `${(n * 100).toFixed(1)}%` : "0%");

/** A table under the canvas: which component costs what, which one carries how much traffic, and which are overloaded. */
export function BreakdownDock({ plan = "free" }: { plan?: "free" | "pro" }) {
  const a = useAnalysis();
  const select = useStudio((s) => s.select);
  const selectedId = useStudio((s) => s.selectedId);
  const open = useStudio((s) => s.dockOpen);
  const setOpen = useStudio.getState().setDock;
  const full = useStudio((s) => s.dockFull);
  const setFull = useStudio.getState().setDockFull;
  const [xl, setXl] = useState<"idle" | "busy" | string>("idle");
  const [tab, setTab] = useState<Tab>("cost");
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: "cost", dir: -1 });
  const { sim } = a;

  const rows = useMemo(() => {
    const entry = sim.entryRps || 1;
    return a.nodes.filter((n) => TYPE_BY_ID[n.data.typeId].role !== "source").map((n) => {
      const load = sim.load[n.id] ?? 0;
      const cost = sim.nodeCost[n.id] ?? 0;
      const u = sim.util[n.id];
      return {
        n, name: nameOf(n), load, cost, util: u ?? null,
        traffic: load / entry,
        share: sim.cost > 0 ? cost / sim.cost : 0,
        per: load > 0 ? cost / ((load * SECONDS_PER_MONTH) / 1e6) : null,
        basis: sim.yours[n.id] ? "Your figure" : sim.priced[n.id] ? "Real price" : "Illustrative",
        host: TYPE_BY_ID[n.data.typeId].host != null,
      };
    });
  }, [a.nodes, sim]);

  const sorted = useMemo(() => {
    const val = (r: (typeof rows)[number]): number | string => ({ name: r.name.toLowerCase(), rps: r.load, traffic: r.traffic, util: r.util ?? -1, cost: r.cost, share: r.share, per: r.per ?? -1 })[sort.key];
    return [...rows].filter((r) => (tab === "cost" ? r.cost > 0 || r.host : !r.host)).sort((x, y) => {
      const a1 = val(x), b1 = val(y);
      return (a1 < b1 ? -1 : a1 > b1 ? 1 : 0) * sort.dir;
    });
  }, [rows, sort, tab]);

  const top = [...rows].sort((x, y) => y.cost - x.cost)[0];
  const busiest = [...rows].filter((r) => !r.host).sort((x, y) => y.traffic - x.traffic)[0];
  const over = rows.filter((r) => (r.util ?? 0) > 1);
  const hot = rows.filter((r) => (r.util ?? 0) >= 0.8 && (r.util ?? 0) <= 1);

  const head = (key: Key, label: string, num = true) => (
    <th scope="col" className={num ? "num" : ""} aria-sort={sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button onClick={() => setSort((s) => ({ key, dir: s.key === key ? (-s.dir as 1 | -1) : key === "name" ? 1 : -1 }))}>{label}{sort.key === key ? (sort.dir === 1 ? " ↑" : " ↓") : ""}</button>
    </th>
  );

  useEffect(() => {
    if (!full) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setFull(false); };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [full, setFull]);

  if (!open) return null;
  const pro = plan === "pro";
  const download = async () => { setXl("busy"); const r = await exportDesign("xlsx"); setXl(r.ok ? "idle" : r.error); };

  const stackRows = (tab === "cost" ? [...rows].sort((x, y) => y.cost - x.cost).filter((r) => r.cost > 0) : [...rows].filter((r) => !r.host).sort((x, y) => y.traffic - x.traffic).filter((r) => r.traffic > 0));
  const stackVal = (r: (typeof rows)[number]) => (tab === "cost" ? r.share : r.traffic);

  return (
    <section className={`dock ${full ? "full" : ""}`} aria-label="Cost and traffic breakdown">
      <header>
        <div className="seg" role="tablist" aria-label="Breakdown">
          <button role="tab" aria-selected={tab === "cost"} onClick={() => { setTab("cost"); setSort({ key: "cost", dir: -1 }); }}>Cost</button>
          <button role="tab" aria-selected={tab === "traffic"} onClick={() => { setTab("traffic"); setSort({ key: "traffic", dir: -1 }); }}>Traffic</button>
        </div>
        <div className="dock-chips">
          <span><small>Total</small><b><Num value={sim.cost} format={fmtMoney} />/mo</b></span>
          <span><small>Per user</small><b><Num value={sim.unitCost} format={fmtUnit} /></b></span>
          {top && top.cost > 0 && <span><small>Biggest cost</small><b>{top.name} {pct(top.share)}</b></span>}
          {busiest && busiest.load > 0 && <span><small>Most traffic</small><b>{busiest.name} {pct(busiest.traffic)}</b></span>}
          <span className={over.length ? "bad" : ""}><small>Over capacity</small><b>{over.length ? over.map((r) => r.name).slice(0, 2).join(", ") + (over.length > 2 ? ` +${over.length - 2}` : "") : hot.length ? `none (${hot.length} near)` : "none"}</b></span>
        </div>
        {pro
          ? <button className="tb" onClick={() => void download()} disabled={xl === "busy"} title="Download as an Excel workbook, with a share link"><Download className="ic" size={15} aria-hidden /> {xl === "busy" ? "Preparing…" : "XLSX"}</button>
          : <Link className="tb" href="/upgrade" title="Excel download is part of Pro"><Lock className="ic" size={14} aria-hidden /> XLSX</Link>}
        <button className="tb" onClick={() => setFull(!full)} aria-label={full ? "Exit full screen" : "Full screen"} title={full ? "Exit full screen (Esc)" : "Full screen"}>{full ? <Minimize2 className="ic" size={16} aria-hidden /> : <Maximize2 className="ic" size={16} aria-hidden />}</button>
        <button className="tb" onClick={() => { setFull(false); setOpen(false); }} aria-label="Close breakdown"><ChevronDown className="ic" size={16} aria-hidden /></button>
      </header>

      {xl !== "idle" && xl !== "busy" && <p className="note err" role="alert" style={{ margin: "0 14px 6px" }}>{xl}</p>}
      <div className="dock-stack" role="img" aria-label={tab === "cost" ? "Share of total cost by component" : "Share of traffic by component"}>
        {stackRows.map((r, i) => <i key={r.n.id} title={`${r.name} ${pct(stackVal(r))}`} className={`s${i % 6}`} style={{ flex: Math.max(stackVal(r), 0.002) }} />)}
      </div>

      <div className="dock-scroll">
        <table>
          <thead>
            {tab === "cost" ? (
              <tr>{head("name", "Component", false)}<th scope="col">Provider</th>{head("rps", "Req/s")}{head("cost", "Cost / mo")}{head("share", "Share of cost")}{head("per", "$ / 1M req")}<th scope="col">Basis</th></tr>
            ) : (
              <tr>{head("name", "Component", false)}<th scope="col">Provider</th>{head("rps", "Req/s")}{head("traffic", "Share of traffic")}{head("util", "Load")}<th scope="col">Status</th></tr>
            )}
          </thead>
          <tbody>
            {sorted.map((r) => {
              const o = offeringOf(r.n.data);
              const status = r.util == null ? "n/a" : r.util > 1 ? "Over capacity" : r.util >= 0.8 ? "Near the limit" : "Fine";
              return (
                <tr key={r.n.id} className={`${selectedId === r.n.id ? "on" : ""} ${(r.util ?? 0) > 1 ? "over" : ""}`} onClick={() => select(r.n.id)}>
                  <th scope="row"><ServiceIcon typeId={r.n.data.typeId} offering={o} custom={r.n.data.icon} size={12} className="mini" />{r.name}</th>
                  <td className="muted">{o ? (o.provider === "Self-hosted" ? o.product : o.provider) : ""}</td>
                  <td className="num">{fmtInt(r.load)}</td>
                  {tab === "cost" ? (
                    <>
                      <td className="num"><b><Num value={r.cost} format={fmtMoney} /></b></td>
                      <td className="num"><span className="mbar"><i style={{ width: `${Math.min(100, r.share * 100)}%` }} /></span>{pct(r.share)}</td>
                      <td className="num">{r.per == null ? "n/a" : fmtMoney(r.per)}</td>
                      <td className="muted">{r.basis}</td>
                    </>
                  ) : (
                    <>
                      <td className="num"><span className="mbar"><i style={{ width: `${Math.min(100, r.traffic * 100)}%` }} /></span>{pct(r.traffic)}</td>
                      <td className="num">{r.util == null ? "n/a" : pct(r.util)}</td>
                      <td className={`muted ${(r.util ?? 0) > 1 ? "bad" : (r.util ?? 0) >= 0.8 ? "warn" : ""}`}>{status}</td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
          {tab === "cost" && <tfoot><tr><th scope="row">Total</th><td /><td className="num">{fmtInt(sim.entryRps)}</td><td className="num"><b>{fmtMoney(sim.cost)}</b></td><td className="num">100%</td><td colSpan={2} /></tr></tfoot>}
        </table>
        {!sorted.length && <p className="note" style={{ padding: 12 }}>Nothing to show yet. Connect a client to some services.</p>}
      </div>
      <p className="dock-foot">Cost basis: <b>Real price</b> came from a page we fetched, <b>Your figure</b> is what you entered, <b>Illustrative</b> is a placeholder until prices load. “Over capacity” uses the illustrative capacity per service type.</p>
    </section>
  );
}
