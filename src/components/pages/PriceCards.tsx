"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Crown, Minus } from "lucide-react";
import { PLAN_LABEL } from "@/lib/brand";
import { FEATURE_GROUPS, type Cell } from "@/lib/pricing/features";
import { PRO_PRICES, type Currency } from "@/lib/pricing/plans";

/** Counts the number up or down instead of jumping. Writes straight to the DOM so no state is set in an effect. */
function Price({ value, symbol, locale }: { value: number; symbol: string; locale: string }) {
  const el = useRef<HTMLElement>(null);
  const shown = useRef(value);
  useEffect(() => {
    const node = el.current; if (!node) return;
    const from = shown.current, to = value;
    const fmt = (n: number) => `${symbol}${Math.round(n).toLocaleString(locale)}`;
    if (from === to || matchMedia("(prefers-reduced-motion: reduce)").matches) { shown.current = to; node.textContent = fmt(to); return; }
    const t0 = performance.now(); let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 520), e = 1 - Math.pow(1 - k, 3);
      shown.current = from + (to - from) * e; node.textContent = fmt(shown.current);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, symbol, locale]);
  return <b ref={el} className="pt-num">{`${symbol}${value.toLocaleString(locale)}`}</b>;
}

function Mark({ v }: { v: Cell }) {
  if (typeof v === "string") return <span className="pt-text">{v}</span>;
  return v ? <span className="pt-yes"><Check size={16} aria-label="Included" /></span> : <Minus size={16} className="pt-no" aria-label="Not included" />;
}

/** One centred table: plans across the top with price and button, features down the side, a tick or dash where they cross. */
export function PriceCards({ pro, billing, manage, notice }: { pro: boolean; billing: boolean; manage: boolean; notice?: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [cur, setCur] = useState<Currency>("USD");
  const [per, setPer] = useState<"month" | "year">("month");
  const p = PRO_PRICES[cur];
  const locale = cur === "INR" ? "en-IN" : "en-US";
  const save = Math.round((1 - p.year / (p.month * 12)) * 100);
  const fmt = (n: number) => `${p.symbol}${n.toLocaleString(locale)}`;

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

  let row = 0;
  return (
    <>
      <div className="up-toggles">
        <div className="seg" role="group" aria-label="Billing period">
          <button aria-pressed={per === "month"} onClick={() => setPer("month")}>Monthly</button>
          <button aria-pressed={per === "year"} onClick={() => setPer("year")}>Yearly <span className="up-save">Save {save}%</span></button>
        </div>
        <div className="seg" role="group" aria-label="Currency">
          <button aria-pressed={cur === "USD"} onClick={() => setCur("USD")}>USD</button>
          <button aria-pressed={cur === "INR"} onClick={() => setCur("INR")}>INR</button>
        </div>
      </div>

      <div className="pt-wrap">
        <table className="pt">
          <caption className="sr-only">Starter and Pro compared</caption>
          <colgroup><col /><col className="pt-c" /><col className="pt-c" /></colgroup>
          <thead>
            <tr>
              <td className="pt-corner" />
              <th scope="col" className="pt-plan">
                <span className="pt-badge quiet">Get started</span>
                <span className="pt-name">{PLAN_LABEL.free}</span>
                <span className="pt-price"><b className="pt-num">{p.symbol}0</b></span>
                <span className="pt-sub">Learn and sketch</span>
                <span className="pt-btn-wrap"><Link href="/app" className="pt-btn ghost">Open the canvas</Link></span>
              </th>
              <th scope="col" className="pt-plan pro">
                <span className="pt-badge">Most popular</span>
                <span className="pt-name"><Crown size={17} aria-hidden />Pro</span>
                <span className="pt-price"><Price value={per === "month" ? p.month : p.year} symbol={p.symbol} locale={locale} /><span className="pt-per"> / {per === "month" ? "mo" : "yr"}</span></span>
                <span className="pt-sub">{per === "year" ? `About ${fmt(Math.round(p.year / 12))} a month` : `or ${fmt(p.year)} a year`}</span>
                <span className="pt-btn-wrap">
                  {pro
                    ? (manage ? <a className="pt-btn" href="/api/billing/portal">Manage billing</a> : <span className="pt-btn done">You are on Pro</span>)
                    : billing
                      ? <button className="pt-btn" disabled={busy} onClick={() => void buy()}>{busy ? "Opening checkout…" : "Upgrade to Pro"}</button>
                      : <button className="pt-btn" disabled>Pro opens soon</button>}
                </span>
              </th>
            </tr>
          </thead>
          {FEATURE_GROUPS.map((g) => (
            <tbody key={g.name}>
              <tr className="pt-group"><th scope="colgroup" colSpan={3}>{g.name}</th></tr>
              {g.rows.map(([label, a, b]) => (
                <tr key={label} className="pt-row" style={{ animationDelay: `${0.25 + row++ * 0.035}s` }}>
                  <th scope="row">{label}</th>
                  <td><Mark v={a} /></td>
                  <td className="pro"><Mark v={b} /></td>
                </tr>
              ))}
            </tbody>
          ))}
          <tfoot>
            <tr><td /><td /><td className="pro pt-end" /></tr>
          </tfoot>
        </table>
      </div>

      <div className="pt-notes" aria-live="polite">
        <p className="pt-founding">Founding price for the first 100 people: <b>{fmt(p.founding)}</b> a month, kept as long as you stay.</p>
        {notice && <p role="status">{notice}</p>}
        {err && <p className="note err" role="alert">{err}</p>}
        {!pro && !billing && <p>Payments are not live yet, so nothing can be bought today. Prices may change before launch.</p>}
        {!pro && billing && <p>Secure checkout by Dodo Payments. Cancel any time from Manage billing.</p>}
        <p className="pt-fine">Prices exclude any tax that applies where you live. <Link href="/terms">Terms</Link> · <Link href="/privacy">Privacy</Link></p>
      </div>
    </>
  );
}
