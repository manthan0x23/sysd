// Scaleway: public Instance server list + public product catalog, no key.
import { getJson, writePending } from "./lib.mjs";
export async function run() {
  const servers = await getJson("https://api.scaleway.com/instance/v1/zones/fr-par-1/products/servers");
  const tiers = Object.entries(servers.servers).map(([id, s]) => ({
    provider: "scaleway", offering: "compute:instances", tierId: id, label: id,
    spec: { vcpu: s.ncpus, ramGb: Math.round(s.ram / 2 ** 30 * 100) / 100, arch: s.arch, gpus: s.gpu, volumeMaxGb: s.volumes_constraint?.max_size ? s.volumes_constraint.max_size / 1e9 : undefined, internetMbps: s.network?.sum_internet_bandwidth ? s.network.sum_internet_bandwidth / 1e6 : undefined },
    price: { amount: s.monthly_price, unit: "month", hourly: s.hourly_price }, currency: "EUR", region: "fr-par-1", source: "https://www.scaleway.com/en/pricing/", api: "https://api.scaleway.com/instance/v1/zones/fr-par-1/products/servers",
  }));
  const rates = [];
  for (let page = 1; page < 40; page++) {
    const j = await getJson(`https://api.scaleway.com/product-catalog/v2alpha1/public-catalog/products?page_size=1000&page=${page}`);
    if (!j.products?.length) break;
    for (const p of j.products) {
      const loc = p.locality ?? {};
      if (loc.zone && loc.zone !== "fr-par-1") continue;
      if (loc.region && loc.region !== "fr-par") continue;
      const price = p.price?.retail_price;
      if (!price) continue;
      rates.push({ sku: p.sku, category: p.service_category, productCategory: p.product_category, product: p.product, variant: p.variant, description: p.description, unit: p.unit_of_measure?.unit, unitSize: p.unit_of_measure?.size, eur: Number(price.units ?? 0) + Number(price.nanos ?? 0) / 1e9, status: p.status });
    }
    if (j.products.length < 1000) break;
  }
  return writePending("scaleway", tiers, { currency: "EUR", rates, rateCount: rates.length, note: "Zone fr-par-1 / region fr-par; EUR." });
}
