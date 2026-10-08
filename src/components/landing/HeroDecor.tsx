"use client";

import { useEffect, useState } from "react";
import { BrandIcon } from "@/components/studio/BrandIcon";
import { Num } from "@/components/studio/Num";

/** A tile: x/y are percentages of the hero area, so the cluster scales with the screen. */
const TILES = [
  { id: "logos:aws-s3", label: "Storage", x: 4, y: 10, d: 0 },
  { id: "logos:aws-lambda", label: "Function", x: 17, y: 36, d: -2 },
  { id: "logos:postgresql", label: "Postgres", x: 6, y: 62, d: -4 },
  { id: "logos:cloudflare-icon", label: "CDN", x: 88, y: 9, d: -1 },
  { id: "logos:redis", label: "Cache", x: 79, y: 36, d: -3 },
  { id: "logos:kafka-icon", label: "Stream", x: 91, y: 63, d: -5 },
  { id: "logos:stripe", label: "Payments", x: 20, y: 83, d: -2.5 },
  { id: "logos:anthropic-icon", label: "LLM", x: 76, y: 85, d: -4.5 },
] as const;

/** Dashed links between tiles, in the same 0-100 space. "from" tiles feed "to" tiles. */
const LINKS = [
  { d: "M10 18 C 14 24, 16 30, 21 40", pill: { x: 14, y: 27, vals: [600, 640, 590, 610] } },
  { d: "M21 46 C 18 54, 12 58, 10 64", pill: { x: 13, y: 55, vals: [168, 180, 160, 172] } },
  { d: "M90 17 C 86 26, 84 31, 83 38", pill: { x: 86, y: 28, vals: [540, 520, 560, 548] } },
  { d: "M83 44 C 86 52, 90 58, 94 65", pill: { x: 89, y: 54, vals: [60, 64, 58, 62] } },
] as const;

function Pill({ x, y, vals }: { x: number; y: number; vals: readonly number[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((n) => (n + 1) % vals.length), 1700 + x * 20);
    return () => clearInterval(t);
  }, [vals.length, x]);
  return <span className="hd-pill" style={{ left: `${x}%`, top: `${y}%` }}><Num value={vals[i]} format={(n) => `${Math.round(n)}/s`} ms={900} /></span>;
}

/** Floating service icons around the headline, linked by moving dashes. Decorative: hidden from assistive tech. */
export function HeroDecor() {
  return (
    <div className="hd" aria-hidden>
      <svg className="hd-links" viewBox="0 0 100 100" preserveAspectRatio="none">
        {LINKS.map((l, i) => <path key={i} d={l.d} className="hd-flow" style={{ animationDelay: `${i * -0.6}s` }} />)}
      </svg>
      {LINKS.map((l, i) => <Pill key={i} {...l.pill} />)}
      {TILES.map((t) => (
        <span key={t.id} className="hd-tile" style={{ left: `${t.x}%`, top: `${t.y}%`, animationDelay: `${t.d}s` }}>
          <span className="hd-chip"><BrandIcon id={t.id} size={30} /></span>
          <small>{t.label}</small>
        </span>
      ))}
    </div>
  );
}
