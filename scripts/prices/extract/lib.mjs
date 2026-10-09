// Helpers for per-provider extractors. An extractor reads data/prices/raw/<provider>__<n>.md and writes
// data/prices/extracted/<provider>.json (validated by validate.mjs). Table pages are parsed, card pages are typed by hand.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { SOURCES } from "../sources.mjs";

const ROOT = new URL("../../../data/prices/", import.meta.url).pathname;
export const raw = (provider, n = 1) => readFileSync(`${ROOT}raw/${provider}__${n}.md`, "utf8");
export const today = () => new Date().toISOString().slice(0, 10);

/** Parse every markdown table; each gets the nearest preceding heading as `section`. */
export function tables(md) {
  const out = [];
  let section = "";
  const lines = md.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const h = lines[i].match(/^#{1,5}\s+(.*)/);
    if (h) section = h[1].replace(/\*+/g, "").trim();
    if (lines[i].startsWith("|") && lines[i + 1]?.match(/^\|\s*-/)) {
      const split = (l) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\*+/g, "").trim());
      const headers = split(lines[i]);
      const rows = [];
      let j = i + 2;
      for (; lines[j]?.startsWith("|"); j++) rows.push(Object.fromEntries(split(lines[j]).map((c, k) => [headers[k] || `c${k}`, c])));
      out.push({ section, headers, rows });
      i = j - 1;
    }
  }
  return out;
}

/** First number in a string: "$1,008.00" -> 1008, "2,000 GiB" -> 2000, "1.191 TiB" -> 1.191 */
export const num = (s) => {
  const m = String(s ?? "").replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : undefined;
};
/** Size in GB(GiB): TiB/TB x1024, MiB/MB /1024, anything else as is. */
export const gib = (s) => {
  const n = num(s);
  if (n === undefined) return undefined;
  if (/\d\s?(tib|tb)\b/i.test(s)) return n * 1024;
  if (/\d\s?(mib|mb)\b/i.test(s)) return n / 1024;
  return n;
};

/** Compact VPS-style tier. Extra fields (diskType, transferGb, introPrice, note...) go in `more`. */
export const vps = (offerings, tier, vcpu, ramGb, diskGb, amount, more = {}) => {
  const { note, introPrice, hourly, ...spec } = more;
  return { offerings: [].concat(offerings), tier, spec: { vcpu, ramGb, ...(diskGb ? { diskGb } : {}), ...spec }, price: { amount, unit: "month" }, ...(introPrice ? { introPrice } : {}), ...(hourly ? { hourly } : {}), ...(note ? { note } : {}) };
};

export function write(provider, tiers, { sources, notes, fetchedAt, currency = "USD" } = {}) {
  mkdirSync(`${ROOT}extracted`, { recursive: true });
  const doc = { provider, currency, sources: sources ?? SOURCES[provider], fetchedAt: fetchedAt ?? today(), tiers, ...(notes ? { notes } : {}) };
  writeFileSync(`${ROOT}extracted/${provider}.json`, JSON.stringify(doc, null, 1) + "\n");
  console.log(`${provider}: ${tiers.length} tiers`);
}

/** Compact plan/tier: plan(offering(s), name, amount|null, unit, { spec, rates:[[name,amount,unit]], note, per }) */
export const plan = (offerings, tier, amount, unit = "month", more = {}) => {
  const { spec = {}, rates, note, hourly, introPrice, contact } = more;
  return {
    offerings: [].concat(offerings), tier, spec,
    ...(amount === null || amount === undefined ? {} : { price: { amount, unit } }),
    ...(rates ? { rates: rates.map(([name, a, u]) => ({ name, amount: a, unit: u })) } : {}),
    ...(contact ? { contact: true } : {}), ...(hourly ? { hourly } : {}), ...(introPrice ? { introPrice } : {}), ...(note ? { note } : {}),
  };
};
