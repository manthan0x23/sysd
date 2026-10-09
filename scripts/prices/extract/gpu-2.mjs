import { raw, tables, num, write, plan } from "./lib.mjs";

// --- Modal: per-second GPU/CPU/memory resource prices (Starter plan); sandbox prices ignored
const md = raw("modal", 1);
const mTiers = [];
for (const m of md.matchAll(/- (Nvidia [^$\n]+?)\$([\d.]+)/g)) {
  const name = m[1].trim(), perSec = +m[2].slice(0, m[2].length / 2); // page prints the number twice with no separator
  mTiers.push({ offerings: ["gpu:modal:gpu-functions", "inference:modal:inference"], tier: name, spec: { gpuModel: name }, price: { amount: Math.round(perSec * 3600 * 1000) / 1000, unit: "hour" }, perSecond: perSec, note: "Per-second billing; hourly = per-second x 3600." });
}
mTiers.push({ offerings: ["worker:modal:functions", "gpu:modal:gpu-functions"], tier: "CPU and memory", spec: {}, rates: [{ name: "CPU core", amount: 0.00003942, unit: "second" }, { name: "memory", amount: 0.00000222, unit: "gb-second" }, { name: "volumes", amount: 0.09, unit: "gb-month" }, { name: "network egress", amount: 0.04, unit: "gb" }] });
mTiers.push(plan(["worker:modal:functions"], "Starter plan", 0, "month", { spec: { seats: 3, includedComputeUsd: 30, egressTib: 1 }, note: "Plus compute; $30/month free credits." }));
mTiers.push(plan(["worker:modal:functions"], "Team plan", 250, "month", { spec: { seats: "unlimited", includedComputeUsd: 100, egressTib: 10 }, note: "Plus compute; $100/month credits." }));
write("modal", mTiers, { notes: "Training and inference offerings use the same per-second GPU prices." });

// --- Replicate: hardware table
const rep = tables(raw("replicate", 1))[0].rows.filter((r) => /\$/.test(Object.values(r)[1] ?? "")).map((r) => {
  const v = Object.values(r);
  const [label, id] = v[0].split("<br>");
  const [perSec, perHr] = v[1].split("<br>");
  return { offerings: ["inference:replicate:models"], tier: label.trim(), spec: { hardwareId: id, gpus: v[2] === "-" ? 0 : num(v[2]), gpuRamGb: v[4] === "-" ? undefined : num(v[4]), ramGb: num(v[5]) }, price: { amount: num(perHr), unit: "hour" }, perSecond: num(perSec) };
});
write("replicate", rep, { notes: "Hardware prices for custom/private models. Public model prices are per run/token and listed per model, not here." });

// --- Hugging Face: PRO / Team user plans
write("hugging-face", [
  plan("inference:hugging-face:inference-endpoints", "Pro account", 9, "month"),
  plan("inference:hugging-face:inference-endpoints", "Team", 20, "user-month"),
  plan("inference:hugging-face:inference-endpoints", "Enterprise", 50, "user-month", { contact: true, note: "'Talk to sales'; $50/user/month shown." }),
], { notes: "These are account plans. Inference Endpoints are priced by instance-hour in a table not captured. Storage: $12/TB/month base private, public repos from $8-18/TB depending on volume." });
