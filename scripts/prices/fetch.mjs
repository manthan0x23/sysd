// Scrape every page in sources.mjs to data/prices/raw/<provider>__<n>.md via the Firecrawl CLI (1 credit/page).
// Existing files are skipped, so re-running never spends credits twice. --force re-fetches. Optional provider filter.
// usage: node scripts/prices/fetch.mjs [--force] [provider ...]
import { execFile } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { mkdir, appendFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { SOURCES } from "./sources.mjs";

const run = promisify(execFile);
const RAW = join(process.cwd(), "data", "prices", "raw");
const args = process.argv.slice(2);
const force = args.includes("--force");
const only = args.filter((a) => !a.startsWith("--"));
const jobs = [];
for (const [prov, urls] of Object.entries(SOURCES)) {
  if (only.length && !only.includes(prov)) continue;
  urls.forEach((url, i) => jobs.push({ prov, url, file: join(RAW, `${prov}__${i + 1}.md`) }));
}
await mkdir(RAW, { recursive: true });
const todo = jobs.filter((j) => force || !existsSync(j.file) || statSync(j.file).size < 200);
console.log(`${jobs.length} pages, ${todo.length} to fetch`);
let done = 0, failed = 0;
async function worker() {
  while (todo.length) {
    const j = todo.shift();
    try {
      let err;
      for (let attempt = 0; attempt < 3; attempt++) {
        try { await run("firecrawl", ["scrape", j.url, "--only-main-content", "--max-age", "0", "-o", j.file], { timeout: 120_000 }); err = undefined; break; }
        catch (e) { err = new Error(String(e.stderr || e.stdout || e.message).trim().split("\n").slice(-2).join(" ")); await new Promise((r) => setTimeout(r, 3000 * (attempt + 1))); }
      }
      if (err) throw err;
      await appendFile(join(RAW, "_manifest.jsonl"), JSON.stringify({ prov: j.prov, url: j.url, file: j.file, fetchedAt: new Date().toISOString() }) + "\n");
      done++;
    } catch (e) {
      failed++;
      await appendFile(join(RAW, "_failed.log"), `${j.prov}\t${j.url}\t${String(e.message).split("\n")[0]}\n`);
    }
    if ((done + failed) % 20 === 0) console.log(`progress ${done + failed}/${done + failed + todo.length} (ok ${done}, failed ${failed})`);
  }
}
await Promise.all(Array.from({ length: 2 }, worker));
console.log(`done: ok ${done}, failed ${failed}`);
