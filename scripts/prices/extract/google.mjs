import { raw, tables, write, plan } from "./lib.mjs";

// Gemini API: first table per model section = standard paid tier. Cells list a current price and often a later (2027) price.
const money = (cell) => [...String(cell).matchAll(/\$([\d.]+)/g)].map((m) => +m[1]);
const seen = new Set();
const gm = [];
for (const t of tables(raw("google", 1))) {
  if (!/^Gemini/.test(t.section) || /live|transcribe|translate/i.test(t.section) || seen.has(t.section)) continue;
  const get = (re) => t.rows.find((r) => re.test(Object.values(r)[0] ?? ""));
  const inRow = get(/^Input price/), outRow = get(/^Output price/);
  if (!inRow || !outRow) continue;
  seen.add(t.section);
  const cacheRow = get(/^Context caching price/);
  const [i1, i2] = money(Object.values(inRow)[2] ?? ""), [o1, o2] = money(Object.values(outRow)[2] ?? ""), [c1] = money(Object.values(cacheRow ?? {})[2] ?? "");
  const rates = [["input", i1, "1m-tokens-in"], ["output", o1, "1m-tokens-out"], ...(c1 !== undefined ? [["cached input", c1, "1m-tokens-cached"]] : []), ...(i2 !== undefined ? [["input from 2027-01-01", i2, "1m-tokens-in"], ["output from 2027-01-01", o2, "1m-tokens-out"]] : [])].filter((r) => r[1] !== undefined);
  gm.push({ offerings: [/embed/i.test(t.section) ? "embeddings:google:gemini-embeddings" : "llm:google:gemini-api"], tier: t.section, spec: {}, rates: rates.map(([name, amount, unit]) => ({ name, amount, unit })), ...(i2 !== undefined ? { note: "Promotional price through Dec 31, 2026; the higher price applies from Jan 1, 2027." } : {}) });
}
gm.push(plan("maps:google:maps-platform", "Maps subscription: Starter", 100, "month", { note: "Subscription plans vs pay-as-you-go ('save up to $180')." }), plan("maps:google:maps-platform", "Maps subscription: Essentials", 275, "month"), plan("maps:google:maps-platform", "Maps subscription: Pro", 1200, "month"));
write("google", gm, { notes: "Gemini 'standard' paid-tier rows only (first table per model); batch/flex/priority tables skipped. Live / Translate / Transcribe (audio, mixed per-token and per-minute prices) skipped. Grounding with Search: 5,000 free/month then $14 per 1,000. Workspace SMTP relay, Looker, GA4 prices not in the scrape." });
