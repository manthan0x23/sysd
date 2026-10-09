import { raw, tables, num, gib, write } from "./lib.mjs";

// --- Lambda: on-demand GPU instance tables (per GPU-hour), sections name the GPU count; 1-Click Clusters are reserved
const lam = [];
for (const t of tables(raw("lambda", 1))) {
  if (!t.headers.includes("PRICE/GPU/HR\\*") && !t.headers.some((h) => h.startsWith("PRICE/GPU/HR"))) continue;
  const key = t.headers.find((h) => h.startsWith("PRICE/GPU/HR"));
  for (const r of t.rows) {
    if (r.VRAM_GPU === undefined && !r["VRAM/GPU"]) { // cluster table: Plan, DURATION, GPU COUNT
      if (num(r[key]) === undefined) continue;
      lam.push({ offerings: ["gpu:lambda:gpu-cloud"], tier: `1-Click Cluster ${r.Plan} x${r["GPU COUNT"]} (${r.DURATION})`, spec: { gpuModel: r.Plan, gpus: r["GPU COUNT"] }, price: { amount: num(r[key]), unit: "hour" }, note: "Per GPU-hour, reserved cluster." });
      continue;
    }
    lam.push({ offerings: ["gpu:lambda:gpu-cloud"], tier: `${r.Plan} ${r["VRAM/GPU"]} (${t.section || "instance"})`, spec: { gpuModel: r.Plan, vramGb: num(r["VRAM/GPU"]), vcpu: num(r.vCPUs), ramGb: gib(r.RAM), storageNote: r.STORAGE, section: t.section }, price: { amount: num(r[key]), unit: "hour" }, note: "Per GPU-hour, on-demand; vCPUs/RAM/storage are per instance (all GPUs in it)." });
  }
}
write("lambda", lam, { notes: "Table order/sections follow the page; section name is stored in spec.section." });

// --- RunPod: card layout "NAME / n GB VRAM / n GB RAM / n vCPUs / $x/hr" (Secure Cloud on-demand)
const rp = [];
const seen = new Set();
for (const m of raw("runpod", 1).matchAll(/\n([A-Za-z0-9][A-Za-z0-9 .\-]{1,30})\n+(\d+) ?GB VRAM\n+(\d+) GB RAM\n+(\d+)\s*vCPUs\n+\$([\d.]+)\/hr/g)) {
  const k = `${m[1]}${m[5]}`;
  if (seen.has(k)) continue;
  seen.add(k);
  rp.push({ offerings: ["gpu:runpod:gpu-pods"], tier: m[1].trim(), spec: { gpuModel: m[1].trim(), vramGb: +m[2], ramGb: +m[3], vcpu: +m[4] }, price: { amount: +m[5], unit: "hour" }, note: "Per GPU-hour, on-demand." });
}
write("runpod", rp, { notes: "Billed per second on the page; price shown per hour. Only cards that parsed fully are recorded." });

// --- CoreWeave: per-node hourly "### NAME ... On-Demand Price: $x / Hour  Spot Price: ..."
const cw = [];
const cwSeen = new Set();
for (const m of raw("coreweave", 1).matchAll(/### ([^\n]+)\n+On-Demand Price: ([^\n]*?)\/ Hour\n+Spot Price: ([^\n]*?)\/ Hour\n+Inference Single CPU Price: ([^\n]*?)\/ Hour/g)) {
  if (cwSeen.has(m[1])) continue;
  cwSeen.add(m[1]);
  const od = num(m[2]), spot = num(m[3]), inf = num(m[4]);
  if (od === undefined && spot === undefined) continue;
  cw.push({ offerings: ["gpu:coreweave:gpu-cloud"], tier: m[1].trim(), spec: { gpuModel: m[1].trim() }, ...(od !== undefined ? { price: { amount: od, unit: "hour" } } : {}), rates: [...(spot !== undefined ? [{ name: "spot", amount: spot, unit: "hour" }] : []), ...(inf !== undefined ? [{ name: "inference single GPU", amount: inf, unit: "hour" }] : [])], note: "On-demand/spot prices are per node (multiple GPUs); inference price is per single GPU." });
}
write("coreweave", cw.filter((t) => t.price || t.rates.length));
