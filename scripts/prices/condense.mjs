// Shrink a raw scraped page to what matters for price extraction: headings and lines with a money amount,
// minus images, links, tracking junk. usage: node scripts/prices/condense.mjs <provider>   (prints to stdout)
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const RAW = new URL("../../data/prices/raw", import.meta.url).pathname;
const prov = process.argv[2];
const CAP = Number(process.argv[3] ?? 140);
const MONEY = /[$€£₹]\s?\d|\d\s?(USD|EUR|INR|GBP)|\bfree\b|\bper\b|\/\s?(mo|month|hr|hour|gb|tb|m|k|1k|user|seat)/i;
const SPEC = /\b(\d+(\.\d+)?\s?(vcpu|cpu|core|gb|tb|mb|gib|ram|memory|storage|ssd|nvme|vcore))/i;
for (const f of readdirSync(RAW).filter((f) => f.startsWith(prov + "__") && f.endsWith(".md")).sort()) {
  const text = readFileSync(join(RAW, f), "utf8")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ");
  console.log(`\n##### ${f}`);
  const lines = text.split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  let prev = "", n = 0;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const keep = /^#{1,4} /.test(l) || MONEY.test(l) || SPEC.test(l) || /^\|/.test(l);
    if (keep && l !== prev && l.length < 220 && n++ < CAP) console.log(l);
    prev = l;
  }
}
