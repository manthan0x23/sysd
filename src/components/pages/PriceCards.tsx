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

export function PriceCards({ pro }: { pro: boolean }) {
  const [cur, setCur] = useState<Currency>("USD");
  const [per, setPer] = useState<"month" | "year">("month");
  const p = PRO_PRICES[cur];
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
          {pro
            ? <p className="up-note">You are on Pro.</p>
            : <><button className="btn-sm" disabled>Pro opens soon</button><p className="up-note">Payments are not live yet, so there is nothing to buy today. Prices may change before launch.</p></>}
        </section>
      </div>
      <p className="up-fine">Prices exclude any tax that applies where you live. <Link href="/terms">Terms</Link> · <Link href="/privacy">Privacy</Link></p>
    </>
  );
}
