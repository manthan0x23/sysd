"use client";

import { Trash2, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { iconFromFile } from "@/lib/uploadIcon";
import {
  AUTO_PLAN_ID, BUCKETS, CUSTOM_PLAN_ID, TYPE_BY_ID, offeringLabel, plansOf,
} from "@/lib/catalog";
import { HOST_OVERHEAD } from "@/lib/fit";
import { fmtInt, fmtMoney } from "@/lib/format";
import { DEFAULT_CUSTOM, isAuto, needOf, offeringOf } from "@/lib/model";
import { OBJECT_PRICES } from "@/lib/pricing/data";
import { SECONDS_PER_MONTH } from "@/lib/pricing/estimate";
import { offeringSummary, planSummary } from "@/lib/pricing/summary";
import { splitFor, CACHE_HIT } from "@/lib/sim";
import { useReadOnly, useStudio } from "@/store/useStudio";
import { Num } from "../Num";
import { Picker, type PickerOption } from "../Picker";
import { ServiceIcon } from "../ServiceIcon";
import { useAnalysis } from "../useAnalysis";
import { nameOf } from "./names";
import { money, rankOfferings, rankPlans, tierBadge } from "./options";

const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

/** The selected service: its name, which provider runs it, which tier, and what that costs. */
export function ComponentCard() {
  const ro = useReadOnly();
  const a = useAnalysis();
  const selectedId = useStudio((s) => s.selectedId);
  const { rename, setOffering, setPlan, setCustom, setIcon, setCustomCost, removeNodes } = useStudio.getState();
  const node = a.nodes.find((n) => n.id === selectedId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [iconError, setIconError] = useState<string | null>(null);

  const model = useMemo(() => {
    if (!node) return null;
    const type = TYPE_BY_ID[node.data.typeId];
    const fit = a.fits[node.id];
    const load = a.sim.load[node.id] ?? 0;
    // A service nothing is connected to would price at $0 for every option, which ranks nothing.
    // Compare options at an example load instead, and say so.
    const example = load === 0 && type.cap != null && !type.host;
    const rps = example ? Math.max(1, (a.sim.entryRps || a.workload.rps) * 0.1) : load;
    const usage = { rps, dataGb: a.workload.dataGb, read: a.workload.readPct / 100, need: fit?.need };
    const offering = offeringOf(node.data);
    return { type, fit, usage, example, offering, ranked: type.role === "source" ? [] : rankOfferings(node, usage), est: a.estimates[node.id] };
  }, [a, node]);

  if (!node || !model) return null;
  const { type, fit, usage, example, offering, ranked, est } = model;
  const parent = node.parentId ? a.nodes.find((n) => n.id === node.parentId) : undefined;

  const providerOptions: PickerOption[] = ranked.map((r) => ({
    id: r.item.id,
    title: offeringLabel(r.item),
    sub: r.item.model === "self-hosted" && r.item.provider !== "Docker" && type.hostable ? "You run it on a server you pay for" : [offeringSummary(r.item), r.note && r.cost != null ? `via ${r.note}` : r.note].filter(Boolean).join(" · "),
    icon: <ServiceIcon typeId={type.id} offering={r.item} />,
    trailing: money(r.cost),
    badge: tierBadge(r.tier),
  }));

  const here = ranked.find((r) => r.item.id === offering?.id);
  const priced = ranked.filter((r) => r.cost != null);
  const best = priced.filter((r) => r.tier === "best");
  const suggestion = priced.length >= 2 && here
    ? best.length
      ? `${best.slice(0, 3).map((r) => offeringLabel(r.item)).join(", ")} ${best.length > 1 ? "are" : "is"} cheapest at your load (${money(best[0].cost)}).${here.cost != null && here.tier !== "best" && best[0].cost ? ` You are on ${offeringLabel(here.item)}, about ${(here.cost / Math.max(best[0].cost, 1)).toFixed(1)}× more.` : ""}`
      : undefined
    : undefined;

  // ----- plan options
  let planOptions: PickerOption[] = [];
  let planValue = node.data.planId ?? AUTO_PLAN_ID;
  if (offering) {
    const rows = rankPlans(node, offering, usage);
    if (type.host === "server") {
      const resolved = fit?.plan;
      planOptions = [
        { id: AUTO_PLAN_ID, title: "Auto · cheapest that fits", sub: resolved ? `Now: ${resolved.label}${resolved.price != null ? ` · ${usd(resolved.price)}/mo` : ""}` : "No plans loaded for this provider yet", icon: <span className="ni"><span className="auto-dot" /></span> },
        ...rows.map((r) => ({
          id: r.plan.id, title: r.plan.label, sub: planSummary(r.plan), trailing: money(r.plan.price ?? null),
          badge: r.fit === "small" ? { label: "Too small", tone: "priciest" as const } : r.fit === "tight" ? { label: "Tight", tone: "warn" as const } : { label: "Fits", tone: "ok" as const },
        })),
        { id: CUSTOM_PLAN_ID, title: "Custom specs", sub: "Enter vCPU, RAM, disk and price yourself" },
      ];
      if (isAuto(node.data)) planValue = AUTO_PLAN_ID;
    } else if (rows.length) {
      planOptions = rows.map((r) => ({ id: r.plan.id, title: r.plan.label, sub: planSummary(r.plan) + (r.plan.note ? "" : ""), trailing: money(r.cost), badge: tierBadge(r.tier) }));
      if (!rows.some((r) => r.plan.id === planValue)) planValue = rows[0].plan.id;
    } else {
      planOptions = [{ id: AUTO_PLAN_ID, title: "Auto · sized to your load", sub: "Tier lists load together with prices" }];
      planValue = AUTO_PLAN_ID;
    }
  }

  const planLabel = type.host === "server" ? "Plan" : type.id === "llm" ? "Model" : "Tier";
  const sources = [...(offering && OBJECT_PRICES[offering.id] ? [OBJECT_PRICES[offering.id]] : []), ...(fit?.plan?.source ? [fit.plan] : [])];
  const activeSrc = offering && plansOf(offering.id).find((p) => p.id === node.data.planId && p.source);

  return (
    <section className="card sel-card" aria-label="Selected service">
      <header className="card-h">
        <ServiceIcon typeId={type.id} offering={offering} custom={node.data.icon} size={16} />
        <div>
          <h3>{nameOf(node)}</h3>
          <small>{type.label}{parent ? ` · runs on ${nameOf(parent)}` : ""}</small>
        </div>
      </header>

      <div className="field">
        <span>Name and icon</span>
        <div className="name-row">
          <button type="button" className="icon-btn" disabled={ro} onClick={() => fileRef.current?.click()} title={node.data.icon ? "Replace image" : "Upload your own icon"} aria-label={node.data.icon ? "Replace icon image" : "Upload an icon image"}>
            <ServiceIcon typeId={type.id} offering={offering} custom={node.data.icon} size={16} />
            <Upload className="ic up" size={11} aria-hidden />
          </button>
          <input className="text" key={node.id} defaultValue={node.data.name ?? ""} placeholder={`e.g. Cart ${type.short ?? type.label}`} maxLength={40} readOnly={ro} aria-label="Service name" onChange={(e) => rename(node.id, e.target.value)} />
          {node.data.icon && !ro && <button type="button" className="pill-btn" onClick={() => { setIcon(node.id, undefined); setIconError(null); }}>Default icon</button>}
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" hidden onChange={async (e) => {
            const f = e.target.files?.[0]; e.target.value = "";
            if (!f) return;
            const r = await iconFromFile(f);
            if (r.ok) { setIcon(node.id, r.dataUrl); setIconError(null); } else setIconError(r.reason);
          }} />
        </div>
        {iconError && <p className="note err" role="alert">{iconError}</p>}
      </div>

      {type.role !== "source" && offering && (
        <>
          <div className="field">
            <span>Provider</span>
            <Picker
              label="Provider" disabled={ro} value={offering.id} options={providerOptions} onChange={(id) => setOffering(node.id, id)}
              footer={<>Ranked by estimated monthly cost at your current load. Options within 15% of the cheapest all count as <b>Best value</b>. Only options with real prices are ranked.</>}
            />
          </div>
          {example && <p className="note">Nothing is connected to this yet, so options are compared as if it handled {fmtInt(usage.rps)} requests per second (10% of your traffic).</p>}
          {suggestion && <p className="suggest"><b>Suggestion</b> {suggestion}</p>}

          <div className="field">
            <span>{planLabel}{type.host === "server" && fit?.auto ? " (auto)" : ""}</span>
            <Picker
              label={planLabel} disabled={ro} value={planValue} options={planOptions} onChange={(id) => setPlan(node.id, id)}
              footer={type.host === "server" ? <>Auto picks the cheapest plan that stays under {Math.round(0.85 * 100)}% of CPU, RAM and disk, and changes it as your numbers change.</> : undefined}
            />
          </div>

          {type.host === "server" && node.data.planId === CUSTOM_PLAN_ID && (
            <div className="custom">
              {([["vcpu", "vCPU"], ["ramGb", "RAM GB"], ["diskGb", "Disk GB"], ["price", "$ / mo"]] as const).map(([k, l]) => (
                <label key={k}><span>{l}</span>
                  <input type="number" min={0} step="any" disabled={ro} value={(node.data.custom ?? DEFAULT_CUSTOM)[k]} onChange={(e) => setCustom(node.id, { [k]: Math.max(0, +e.target.value) })} />
                </label>
              ))}
            </div>
          )}
        </>
      )}

      {type.host === "server" && fit && fit.have && (
        <p className={`fitline ${fit.verdict}`}>
          {fit.verdict === "over" ? `Does not fit: ${fit.over.join(", ")} exceeded. ` : fit.verdict === "tight" ? "Tight: over 80% used. " : "Fits. "}
          Needs {needOf(fit.need)} (includes {HOST_OVERHEAD.ramGb} GB RAM and {HOST_OVERHEAD.diskGb} GB disk for the OS); the plan has {needOf(fit.have)}.
        </p>
      )}
      {type.host === "container" && fit && <p className="note">Needs {needOf(fit.need)}. {fit.children} service{fit.children === 1 ? "" : "s"} inside.</p>}

      {!type.host && offering?.model === "self-hosted" && type.hostable && (
        <>
          <p className="note">{parent ? `Runs on ${nameOf(parent)}.` : "Not on a server yet: drag it into a server block to check the fit."}</p>
          <p className="note"><b>Needs {needOf(type.hostable.run({ rps: usage.rps, dataGb: usage.dataGb, readPct: usage.read * 100 }))}.</b> {type.hostable.basis} <em>({type.hostable.confidence === "sourced" ? "sourced" : "rule of thumb, roughly ±50%"})</em></p>
        </>
      )}

      {type.role !== "source" && (
        <div className="own-cost">
          <div className="own-h">
            <span>Your own cost</span>
            {node.data.customCost
              ? <button type="button" className="pill-btn" disabled={ro} onClick={() => setCustomCost(node.id, undefined)}>Use prices instead</button>
              : <button type="button" className="pill-btn" disabled={ro} onClick={() => setCustomCost(node.id, { fixed: Math.round(est?.monthly ?? 0), perMillion: 0 })}>Set my own</button>}
          </div>
          {node.data.customCost ? (
            <>
              <div className="custom">
                <label><span>Fixed, $ per month</span>
                  <input type="number" min={0} step="any" disabled={ro} value={node.data.customCost.fixed} onChange={(e) => setCustomCost(node.id, { ...node.data.customCost!, fixed: Math.max(0, +e.target.value) })} />
                </label>
                <label><span>Per 1M requests, $</span>
                  <input type="number" min={0} step="any" disabled={ro} value={node.data.customCost.perMillion} onChange={(e) => setCustomCost(node.id, { ...node.data.customCost!, perMillion: Math.max(0, +e.target.value) })} />
                </label>
              </div>
              <label className="field">
                <span>Counts as</span>
                <select disabled={ro} value={node.data.customCost.bucket ?? type.bucket ?? "managed"} onChange={(e) => setCustomCost(node.id, { ...node.data.customCost!, bucket: e.target.value as (typeof BUCKETS)[number] })}>
                  {BUCKETS.map((b) => <option key={b} value={b}>{b[0].toUpperCase() + b.slice(1)}</option>)}
                </select>
              </label>
              <p className="note">Replaces every other price for this service. The fixed amount is charged every month; the per-request part scales with the traffic that reaches it ({fmtInt(usage.rps)} req/s now).</p>
            </>
          ) : <p className="note">Use this when you already know the price, such as a negotiated rate or a service we do not list.</p>}
        </div>
      )}

      {est && !node.data.customCost && (
        <div className="est">
          <div className="est-top"><span>Estimated at your load</span><b><Num value={est.monthly} format={(n) => `${fmtMoney(n)}/mo`} /></b></div>
          <ul>{est.lines.map((l) => <li key={l.label}><span>{l.label}</span><b>{usd(l.amount)}</b></li>)}</ul>
          <small>{est.assumptions.join(" ")}{est.partial ? ` ${est.partial}` : ""}</small>
        </div>
      )}
      {!est && !type.host && type.cap != null && offering && offering.model !== "self-hosted" && <p className="note">No real prices for this service yet, so its cost is an illustrative figure.</p>}

      {(sources.length > 0 || activeSrc) && (
        <p className="note src">
          Source: {[...new Set([...sources.map((s) => s.source), activeSrc?.source].filter(Boolean) as string[])].map((u) => <a key={u} href={u} target="_blank" rel="noreferrer">{new URL(u).host}</a>).reduce<React.ReactNode[]>((acc, el, i) => (i ? [...acc, ", ", el] : [el]), [])}, fetched {(sources[0]?.fetchedAt ?? activeSrc?.fetchedAt ?? "")}.
        </p>
      )}
      {type.role !== "source" && usage.rps > 0 && !type.host && <p className="note">{fmtInt(usage.rps)} requests per second reach it ({fmtInt(usage.rps * SECONDS_PER_MONTH / 1e6)}M a month).</p>}
      {!ro && (
        <div className="del-row">
          <button type="button" className="pill-btn danger" onClick={() => removeNodes([node.id])}><Trash2 className="ic" size={13} aria-hidden /> Delete {type.host ? "this block" : "this service"}</button>
          {type.host && fit && fit.children > 0 && <small>Also removes the {fit.children} service{fit.children === 1 ? "" : "s"} inside. You can undo it.</small>}
        </div>
      )}
    </section>
  );
}

/** The selected link: how much of its source's traffic it carries, and a way to set that by hand. */
export function LinkEditor() {
  const ro = useReadOnly();
  const a = useAnalysis();
  const edgeId = useStudio((s) => s.selectedEdgeId);
  const { setEdgeWeight, removeEdges } = useStudio.getState();
  const edge = a.edges.find((e) => e.id === edgeId);
  if (!edge) return null;
  const from = a.nodes.find((n) => n.id === edge.source);
  const to = a.nodes.find((n) => n.id === edge.target);
  if (!from || !to) return null;

  const siblings = a.edges.filter((e) => e.source === edge.source);
  const roleOf = (id: string) => TYPE_BY_ID[a.nodes.find((n) => n.id === id)!.data.typeId].role;
  const { weights, mode } = splitFor(siblings, roleOf, a.workload.readPct);
  const share = weights[siblings.findIndex((e) => e.id === edge.id)] ?? 0;
  const manual = (edge.data as { weight?: number } | undefined)?.weight;
  const carried = a.sim.edgeLoad[edge.id] ?? 0;
  const read = a.workload.readPct;

  const why: Record<string, string> = {
    single: `${nameOf(from)} has one link out, so everything it receives flows here.`,
    even: `${nameOf(from)} splits its traffic evenly over its ${siblings.length} links.`,
    "cache-db": `Reads (${read}%) go to the cache. The database gets all writes plus the ${Math.round(read * (1 - CACHE_HIT))}% of requests that are reads the cache misses. Any other link gets a 10% async share.`,
    manual: "Some links out of this service have shares you set by hand; links you did not set split what is left.",
  };

  return (
    <section className="card sel-card" aria-label="Selected link">
      <header className="card-h">
        <span className="ni"><span className="auto-dot" /></span>
        <div><h3>{nameOf(from)} → {nameOf(to)}</h3><small>Link</small></div>
      </header>
      <div className="est-top"><span>Carries</span><b><Num value={carried} format={(n) => `${fmtInt(n)} req/s`} /></b></div>
      <p className="note">{Math.round(share * 100)}% of what {nameOf(from)} sends on. {why[mode]}</p>
      <label className="sl">
        <span>Share of {nameOf(from)}&apos;s traffic<b>{Math.round((manual ?? share * 100))}%</b></span>
        <input type="range" min={0} max={100} step={1} disabled={ro} value={Math.round(manual ?? share * 100)} onChange={(e) => setEdgeWeight(edge.id, +e.target.value)} />
      </label>
      <div className="row-actions">
        {!ro && <button className="pill-btn danger" onClick={() => removeEdges([edge.id])}><Trash2 className="ic" size={13} aria-hidden /> Remove link</button>}
        <button className="pill-btn" disabled={ro || manual == null} onClick={() => setEdgeWeight(edge.id, undefined)}>Automatic for this link</button>
        {siblings.length > 1 && <button className="pill-btn" disabled={ro || !siblings.some((e) => (e.data as { weight?: number } | undefined)?.weight != null)} onClick={() => siblings.forEach((e) => setEdgeWeight(e.id, undefined))}>Reset all from {nameOf(from)}</button>}
      </div>
    </section>
  );
}
