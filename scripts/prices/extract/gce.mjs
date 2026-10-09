// Google Compute Engine machine-type tables (pages 42-47 of google-cloud). Price = first "$x / 1 hour" cell = on-demand default.
import { raw, num, gib, write, vps } from "./lib.mjs";

const FAMILY = { 42: "general-purpose", 43: "compute-optimized", 44: "memory-optimized", 45: "network-optimized", 46: "storage-optimized", 47: "accelerator-optimized" };
const tiers = [];
const seen = new Set();
for (const [n, family] of Object.entries(FAMILY)) {
  for (const line of raw("google-cloud", +n).split("\n")) {
    if (!line.startsWith("| ") || !line.includes("/ 1 hour")) continue;
    const c = line.trim().replace(/^\||\|$/g, "").split("|").map((x) => x.replace(/\*+/g, "").replace(/<br>/g, " ").trim());
    const name = c[0];
    if (!/^[a-z0-9][a-z0-9.-]*-[a-z0-9-]+$/i.test(name) || seen.has(name)) continue;
    const priceCell = c.find((x) => /^\$[\d.]+ \/ 1 hour/.test(x));
    const comp = c.find((x) => /vCPUs:/.test(x));
    const vcpu = comp ? num(comp.match(/vCPUs:\s*([\d,]+)/)?.[1]) : num(c[1]);
    const memCell = comp ? comp.match(/Memory:\s*([\d,.]+\s*(?:GiB|GB))/)?.[1] : c.slice(1).find((x) => /GiB|GB/.test(x) && !/\$/.test(x));
    const price = num(priceCell);
    if (!Number.isFinite(price) || !Number.isFinite(vcpu)) continue;
    seen.add(name);
    const t = vps(n == 47 ? ["gpu:google-cloud:gpu-vms", "vps:google-cloud:compute-engine"] : "vps:google-cloud:compute-engine", name, vcpu, memCell ? gib(memCell) : undefined, undefined, Math.round(price * 730 * 100) / 100, { family, hourly: price, ...(comp ? { gpuModel: c[1], gpus: num(comp.match(/GPUs:\s*(\d+)/)?.[1]) } : {}) });
    t.note = "monthly = hourly x 730; on-demand default (Linux, no committed-use discount).";
    tiers.push(t);
  }
}
write("google-cloud-compute", tiers, { sources: ["https://cloud.google.com/compute/vm-instance-pricing", "https://cloud.google.com/products/compute/pricing/general-purpose", "https://cloud.google.com/products/compute/pricing/accelerator-optimized"], notes: "Prices are the 'Default / Price (USD)' column of Google's machine-type tables (region as shown on the page, typically us-central1; the page does not state it in the scraped text). Committed-use discount columns are not exported." });
