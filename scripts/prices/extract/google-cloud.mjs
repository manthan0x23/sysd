// Google Cloud: pricing pages have headerless markdown tables. Every table row with a $ amount becomes a rate
// (amount = FIRST price column, the default/lowest-numbered region; all columns kept in `values`). Prose-only prices are not captured.
import { raw, write } from "./lib.mjs";

const PAGES = {
  2: ["containers:google-cloud:cloud-run", "fn:google-cloud:cloud-run-functions", "worker:google-cloud:cloud-run-jobs"],
  3: ["fn:google-cloud:cloud-run-functions"], 4: ["app:google-cloud:app-engine"], 5: ["k8s:google-cloud:gke"],
  6: ["postgres:google-cloud:cloud-sql-for-postgresql", "mysql:google-cloud:cloud-sql-for-mysql", "sqlserver:google-cloud:cloud-sql-for-sql-server"],
  7: ["postgres:google-cloud:alloydb"], 8: ["kv:google-cloud:firestore", "mongodb:google-cloud:firestore"], 9: ["kv:google-cloud:bigtable", "timeseries:google-cloud:bigtable"],
  10: ["newsql:google-cloud:spanner"], 11: ["redis:google-cloud:memorystore"], 12: ["object:google-cloud:cloud-storage", "archive:google-cloud:archive-storage", "static:google-cloud:storage-cdn"],
  13: ["block:google-cloud:persistent-disk"], 14: ["file:google-cloud:filestore"], 15: ["egress:google-cloud:network-egress"], 16: ["lb:google-cloud:cloud-load-balancing"],
  17: ["cdn:google-cloud:cloud-cdn"], 18: ["dns:google-cloud:cloud-dns"], 19: ["waf:google-cloud:cloud-armor"], 20: ["apigw:google-cloud:api-gateway-apigee"],
  21: ["queue:google-cloud:cloud-tasks"], 22: ["pubsub:google-cloud:pub-sub", "iot:google-cloud:pub-sub-for-devices"], 23: ["stream:google-cloud:managed-service-for-apache-kafka"],
  24: ["workflow:google-cloud:cloud-composer"], 25: ["warehouse:google-cloud:bigquery"], 26: ["spark:google-cloud:dataproc"], 27: ["streamproc:google-cloud:dataflow"],
  28: ["etl:google-cloud:data-fusion"], 29: ["llm:google-cloud:vertex-ai", "inference:google-cloud:vertex-ai-endpoints", "mltrain:google-cloud:vertex-ai-training", "search:google-cloud:vertex-ai-search"],
  30: ["speech:google-cloud:speech-to-text"], 31: ["vision:google-cloud:document-ai-vision"], 32: ["logs:google-cloud:logging", "metrics:google-cloud:monitoring"],
  33: ["secrets:google-cloud:secret-manager-kms"], 34: ["ci:google-cloud:cloud-build"], 35: ["registry:google-cloud:artifact-registry"], 36: ["cron:google-cloud:cloud-scheduler"],
  37: ["media:google-cloud:transcoder-api"], 38: ["cdc:google-cloud:datastream"], 39: ["backup:google-cloud:backup-and-dr"],
};
const clean = (s) => s.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\*+/g, "").replace(/<br>/g, " ").replace(/\\_/g, "_").trim();
const tiers = [];
for (const [n, offerings] of Object.entries(PAGES)) {
  let section = "";
  const seen = new Set();
  for (const line of raw("google-cloud", +n).split("\n")) {
    const h = line.match(/^#{1,4}\s+(.*)/);
    if (h) { section = clean(h[1]); continue; }
    if (!line.startsWith("|") || /^\|\s*-/.test(line) || !line.includes("$")) continue;
    const cells = line.trim().replace(/^\||\|$/g, "").split("|").map(clean);
    const values = cells.slice(1).filter((c) => /^\$[\d.,]+/.test(c)).map((c) => +c.match(/\$([\d.,]+)/)[1].replace(/,/g, ""));
    const first = /^\$[\d.,]+/.test(cells[0]) ? +cells[0].match(/\$([\d.,]+)/)[1].replace(/,/g, "") : values[0];
    if (first === undefined || !Number.isFinite(first)) continue;
    const label = (/^\$/.test(cells[0]) ? cells[1] ?? "" : cells[0]).slice(0, 140);
    const key = `${section}|${label}|${first}`;
    if (!label || seen.has(key)) continue;
    seen.add(key);
    tiers.push({ offerings, tier: `${section ? section.slice(0, 60) + ": " : ""}${label}`.slice(0, 200), spec: { page: `google-cloud__${n}` }, rates: [{ name: label, amount: first, unit: "other", values }] });
  }
}
write("google-cloud", tiers, { notes: "Rate rows scraped from headerless tables; amount = first price column (default region / lowest tier), `values` = all columns (other regions or committed-use tiers). Units are in the row label (per vCPU-second, per GiB-month, per 1M requests ...). Prose-only prices, Compute Engine machine-type prices (JS-rendered table) and Cloud Functions page (no prices in scrape) are not captured." });
