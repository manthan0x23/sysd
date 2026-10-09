// Oracle Cloud: public price-list API, no key. https://apexapps.oracle.com/pls/apex/cetools/api/v1/products/
import { getJson, writePending } from "./lib.mjs";
const API = "https://apexapps.oracle.com/pls/apex/cetools/api/v1/products/?currencyCode=USD";
export async function run() {
  const j = await getJson(API);
  const rates = j.items.flatMap((i) => (i.currencyCodeLocalizations ?? []).flatMap((c) => c.currencyCode === "USD" ? c.prices.map((p) => ({ partNumber: i.partNumber, product: i.displayName, category: i.serviceCategory, unit: i.metricName, model: p.model, usd: p.value, rangeMin: p.rangeMin, rangeMax: p.rangeMax })) : []));
  return writePending("oracle-cloud", [], { source: "https://www.oracle.com/cloud/price-list/", api: API, lastUpdated: j.lastUpdated, currency: "USD", rates, offerings: ["vps:oracle-cloud:compute"] });
}
