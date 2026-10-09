// Akamai / Linode: public API, no key. https://api.linode.com/v4/linode/types
import { getJson, round, writePending } from "./lib.mjs";

const API = "https://api.linode.com/v4";
const PAGE = "https://www.linode.com/pricing/";

const CLASS = { nanode: "shared", standard: "shared", highmem: "highmem", dedicated: "dedicated", premium: "premium", gpu: "gpu", accelerated: "accelerated" };

export async function run() {
  const [types, obj] = await Promise.all([getJson(`${API}/linode/types?page_size=500`), getJson(`${API}/object-storage/types`)]);
  const tiers = types.data.map((t) => ({
    provider: "akamai-linode",
    offering: `compute:${CLASS[t.class] ?? t.class}`,
    tierId: t.id,
    label: t.label,
    spec: { vcpu: t.vcpus, ramGb: round(t.memory / 1024, 3), diskGb: round(t.disk / 1024, 1), transferGb: t.transfer, gpus: t.gpus },
    price: { amount: t.price.monthly, unit: "month", hourly: t.price.hourly },
    regionPrices: Object.fromEntries((t.region_prices ?? []).map((r) => [r.id, { amount: r.monthly, hourly: r.hourly }])),
    currency: "USD",
    region: "default",
    source: PAGE,
    api: `${API}/linode/types`,
  }));
  const storage = obj.data.map((t) => ({
    provider: "akamai-linode",
    offering: "storage:object",
    tierId: t.id,
    label: t.label,
    spec: { transferGb: t.transfer },
    price: { amount: t.price.monthly, unit: t.price.monthly == null ? "gb-hour" : "month", hourly: t.price.hourly },
    regionPrices: Object.fromEntries((t.region_prices ?? []).map((r) => [r.id, { amount: r.monthly, hourly: r.hourly }])),
    currency: "USD",
    region: "default",
    source: "https://www.linode.com/products/object-storage/",
    api: `${API}/object-storage/types`,
  }));
  return writePending("akamai-linode", [...tiers, ...storage], { note: "Default prices are US regions; regionPrices lists regions that differ." });
}
