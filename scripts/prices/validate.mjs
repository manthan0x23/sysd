// Validate hand-extracted price files in data/prices/extracted/*.json against the catalog.
// usage: npx tsx scripts/prices/validate.mjs [provider ...]
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { OFFERING_BY_ID } from "../../src/lib/catalog/offerings.ts";

const DIR = join(process.cwd(), "data", "prices", "extracted");
const UNITS = new Set(["month", "year", "hour", "minute", "second", "day", "gb-month", "gb-hour", "gb", "tb", "tb-month", "request", "1k-requests", "1m-requests", "1m-tokens-in", "1m-tokens-out", "1m-tokens-cached", "1m-tokens", "1k-tokens", "cu-hour", "vcpu-hour", "vcpu-month", "gb-second", "gb-ram-hour", "gb-ram-month", "user-month", "seat-month", "mau", "message", "sms", "email", "1k-emails", "minute-video", "gb-egress", "gb-ingested", "gb-stored", "event", "1m-events", "percent", "fixed", "percent+fixed", "unit-hour", "unit-month", "other"]);
const only = process.argv.slice(2);
let errors = 0, tiers = 0, files = 0;
for (const f of readdirSync(DIR).filter((f) => f.endsWith(".json")).sort()) {
  if (only.length && !only.includes(f.replace(/\.json$/, ""))) continue;
  files++;
  let d;
  try { d = JSON.parse(readFileSync(join(DIR, f), "utf8")); } catch (e) { console.log(`${f}: invalid JSON: ${e.message}`); errors++; continue; }
  const err = (m) => { console.log(`${f}: ${m}`); errors++; };
  if (!d.provider || !d.sources?.length || !d.fetchedAt) err("needs provider, sources[], fetchedAt");
  if (!/^[A-Z]{3}$/.test(d.currency ?? "")) err("needs a 3-letter currency");
  for (const [i, t] of (d.tiers ?? []).entries()) {
    tiers++;
    const at = `tier #${i} (${t.tier})`;
    if (!t.tier) err(`${at}: missing tier name`);
    if (!t.offerings?.length) err(`${at}: missing offerings`);
    for (const o of t.offerings ?? []) if (!OFFERING_BY_ID[o]) err(`${at}: unknown offering id ${o}`);
    if (!t.price && !t.rates?.length && !t.contact) err(`${at}: needs price or rates`);
    for (const p of [t.price, ...(t.rates ?? [])].filter(Boolean)) {
      if (typeof p.amount !== "number" || !(p.amount >= 0)) err(`${at}: bad amount ${JSON.stringify(p)}`);
      if (!UNITS.has(p.unit)) err(`${at}: unknown unit "${p.unit}"`);
    }
  }
}
console.log(`${files} files, ${tiers} tiers, ${errors} problems`);
process.exitCode = errors ? 1 : 0;
