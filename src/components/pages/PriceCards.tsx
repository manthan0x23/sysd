"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { PRO_PRICES, type Currency } from "@/lib/pricing/plans";

const FREE = ["Draw systems with 70+ services and nested hosts", "Traffic sliders and live load on every component", "Cost estimate and breakdown table", "Save designs and share read-only links"];
const PRO: [string, string?][] = [
  ["Everything in Free"],
  ["Exports", "XLSX with formulas and your share link, CSV, JSON, SVG, PNG and a printable report"],
  ["Teams", "Viewer and editor roles, invite links, shared designs"],
  ["AI agent", "Describe a system and it builds it for you. Coming in a later release."],
];

export function PriceCards({ pro, billing, manage, notice }: { pro: boolean; billing: boolean; manage: boolean; notice?: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [cur, setCur] = useState<Currency>("USD");
  const [per, setPer] = useState<"month" | "year">("month");
  const p = PRO_PRICES[cur];
  const buy = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/billing/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ interval: per, currency: cur }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.url) { location.assign(j.url); return; }
      setErr(j.error ?? "Could not start checkout. Try again.");
    } catch { setErr("Could not reach the server. Try again."); }
    setBusy(false);
  };
  const fmt = (n: number) => `${p.symbol}${n.toLocaleString(cur === "INR" ? "en-IN" : "en-US")}`;
  const shown = per === "month" ? p.month : p.year;
  const yearlyAsMonthly = Math.round(p.year / 12);
  return (
    <>
      <div className="up-toggles">
        <div className="seg" role="group" aria-label="Billing period">
          <button aria-pressed={per === "month"} onClick={() => setPer("month")}>Monthly</button>
          <button aria-pressed={per === "year"} onClick={() => setPer("year")}>Yearly</button>
        </div>
        <div className="seg" role="group" aria-label="Currency">
          <button aria-pressed={cur === "USD"} onClick={() => setCur("USD")}>USD</button>
          <button aria-pressed={cur === "INR"} onClick={() => setCur("INR")}>INR</button>
        </div>
      </div>
      <div className="up-grid">
        <section className="up-card" aria-labelledby="free-h">
          <h2 id="free-h">Free</h2>
          <p className="up-price"><b>{p.symbol}0</b></p>
          <ul>{FREE.map((f) => <li key={f}><Check size={15} aria-hidden />{f}</li>)}</ul>
        </section>
        <section className="up-card pro" aria-labelledby="pro-h">
          <h2 id="pro-h">Pro</h2>
          <p className="up-price"><b>{fmt(shown)}</b> / {per}</p>
          {per === "year" && <p className="up-sub">About {fmt(yearlyAsMonthly)} a month, billed yearly</p>}
          <p className="up-sub">Founding price for the first 100 people: {fmt(p.founding)} a month for as long as you stay.</p>
          <ul>{PRO.map(([t, d]) => <li key={t}><Check size={15} aria-hidden /><span><b>{t}</b>{d && <small>{d}</small>}</span></li>)}</ul>
          {notice && <p className="up-note" role="status">{notice}</p>}
          {pro
            ? <><p className="up-note">You are on Pro.</p>{manage && <a className="btn-sm" href="/api/billing/portal">Manage billing</a>}</>
            : billing
              ? <><button className="btn-sm" disabled={busy} onClick={() => void buy()}>{busy ? "Opening checkout…" : "Upgrade to Pro"}</button>{err && <p className="note err" role="alert">{err}</p>}<p className="up-note">Secure checkout by Dodo Payments, our merchant of record. Cancel any time from Manage billing.</p></>
              : <><button className="btn-sm" disabled>Pro opens soon</button><p className="up-note">Payments are not live yet, so there is nothing to buy today. Prices may change before launch.</p></>}
        </section>
      </div>
      <p className="up-fine">Prices exclude any tax that applies where you live. <Link href="/terms">Terms</Link> · <Link href="/privacy">Privacy</Link></p>
    </>
  );
}
