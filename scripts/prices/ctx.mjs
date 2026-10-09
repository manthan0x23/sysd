// Show context around a regex in a provider's raw pages. usage: node scripts/prices/ctx.mjs <provider> <regex> [before=4] [after=2] [maxHits=6]
import { readdirSync, readFileSync } from "node:fs";
const RAW = new URL("../../data/prices/raw", import.meta.url).pathname;
const [prov, re, b = "4", a = "2", max = "6"] = process.argv.slice(2);
const rx = new RegExp(re, "i");
let hits = 0;
for (const f of readdirSync(RAW).filter((f) => f.startsWith(prov + "__") && f.endsWith(".md")).sort()) {
  const L = readFileSync(`${RAW}/${f}`, "utf8").split("\n").map((l) => l.replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").trim());
  for (let i = 0; i < L.length && hits < +max; i++) if (rx.test(L[i])) {
    hits++;
    console.log(`--- ${f}:${i + 1}`);
    console.log(L.slice(Math.max(0, i - +b), i + +a + 1).filter(Boolean).map((l) => "  " + l.slice(0, 120)).join("\n"));
  }
}
