// Vultr: public plans endpoint, no key. https://api.vultr.com/v2/plans
import { getJson, round, writePending } from "./lib.mjs";

const API = "https://api.vultr.com/v2/plans?type=all&per_page=500";
const PAGE = "https://www.vultr.com/pricing/";

// Vultr plan id prefix -> product family
const FAMILY = { vc2: "shared", vhf: "high-frequency", vhp: "high-performance", voc: "dedicated", vcg: "gpu", vdm: "dedicated", vx1: "extreme" };

export async function run() {
  const { plans } = await getJson(API);
  const tiers = plans.map((p) => ({
    provider: "vultr",
    offering: `compute:${FAMILY[p.type] ?? p.type}`,
    tierId: p.id,
    label: p.id,
    spec: { vcpu: p.vcpu_count, ramGb: round(p.ram / 1024, 3), diskGb: p.disk, diskType: p.disk_type, transferGb: p.bandwidth, gpus: p.gpu_brand && p.gpu_brand !== "none" ? 1 : 0, cpuVendor: p.cpu_vendor },
    price: { amount: p.monthly_cost, unit: "month", hourly: p.hourly_cost },
    regionPrices: Object.fromEntries(Object.entries(p.location_cost ?? {}).map(([k, v]) => [k, v])),
    locations: p.locations,
    currency: "USD",
    region: "default",
    source: PAGE,
    api: API,
  }));
  return writePending("vultr", tiers, {});
}
