// Which providers are fetched / extracted / still missing. usage: node scripts/prices/status.mjs
import { existsSync, readdirSync } from "node:fs";
import { SOURCES } from "./sources.mjs";
const D = new URL("../../data/prices/", import.meta.url).pathname;
const raw = readdirSync(D + "raw").filter((f) => f.endsWith(".md"));
const fetched = (p) => SOURCES[p].every((_, i) => raw.includes(`${p}__${i + 1}.md`));
const rows = Object.keys(SOURCES).map((p) => ({ p, fetched: fetched(p), partial: !fetched(p) && raw.some((f) => f.startsWith(p + "__")), extracted: existsSync(`${D}extracted/${p}.json`) }));
const list = (f) => rows.filter(f).map((r) => r.p).join(" ");
console.log(`providers ${rows.length} | fully fetched ${rows.filter((r) => r.fetched).length} | extracted ${rows.filter((r) => r.extracted).length}`);
console.log("\nEXTRACTED:", list((r) => r.extracted));
console.log("\nFETCHED, NOT EXTRACTED:", list((r) => r.fetched && !r.extracted));
console.log("\nPARTIAL FETCH:", list((r) => r.partial));
console.log("\nNOT FETCHED:", list((r) => !r.fetched && !r.partial));
