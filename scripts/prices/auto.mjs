// Heuristic plan finder for pricing pages: a heading/bold line followed shortly by a price line becomes a candidate tier.
// Output is a REVIEW aid, never published as is. usage: node scripts/prices/auto.mjs <provider> [maxPerPage]
import { readdirSync, readFileSync } from "node:fs";

const RAW = new URL("../../data/prices/raw", import.meta.url).pathname;
const prov = process.argv[2];
const MAX = Number(process.argv[3] ?? 14);
const PRICE = /(?:from|starts? at|starting at|only|just|then)?\s*(?:US)?(?:[$€£₹]|USD |EUR )\s?(\d[\d,]*(?:\.\d+)?)\s*(?:USD|EUR)?\s*(\/|per|a)?\s*(user|seat|member|mo(?:nth)?|yr|year|hour|hr|day|gb|tb|million|m\b|k\b|1k|1m|request|message|sms|email|minute|min|credit|unit|vcpu|node|project|app|site|domain)?/i;
const clean = (l) => l.replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[*_`\\]/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
for (const f of readdirSync(RAW).filter((f) => f.startsWith(prov + "__") && f.endsWith(".md")).sort()) {
  const lines = readFileSync(`${RAW}/${f}`, "utf8").split("\n");
  const out = [];
  let head = "", headAt = -99, prev = "";
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const l = clean(raw);
    if (!l) continue;
    if (/^#{1,5} /.test(raw)) { head = l.replace(/^#+\s*/, ""); headAt = i; continue; }
    if (/^\*\*[^*]{2,40}\*\*$/.test(raw.trim())) { head = l; headAt = i; continue; }
    const m = l.match(PRICE);
    if (m && /^(from |starts? at )?[$€£₹]/i.test(l) && prev && prev.length <= 32 && !/[$€£₹\d]/.test(prev) && i - headAt >= 1) { head = prev; headAt = i; }
    prev = l;
    if (m && l.length < 160 && i - headAt < 14 && head && !/^(faq|frequently|questions|compare)/i.test(head)) {
      out.push(`${head.slice(0, 50)} | ${l.slice(0, 110)}`);
      if (out.length >= MAX) break;
    }
  }
  console.log(`## ${f}\n${out.join("\n")}`);
}
