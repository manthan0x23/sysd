// Microsoft Azure: Retail Prices API, public, no key. https://prices.azure.com/api/retail/prices
// Pay-as-you-go ("Consumption") rates in East US plus global/regionless meters. Generic flattener like aws.mjs.
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { OUT_DIR, getJson } from "./lib.mjs";

const API = "https://prices.azure.com/api/retail/prices";
export const AZURE_SERVICES = {
  "Virtual Machines": { offerings: ["vps:microsoft-azure:virtual-machines", "gpu:microsoft-azure:nd-nc-series"], skip: (i) => /windows/i.test(i.productName) || /spot|low priority/i.test(i.skuName), maxPages: 60 },
  Functions: { offerings: ["fn:microsoft-azure:functions"] },
  "Azure App Service": { offerings: ["app:microsoft-azure:app-service", "static:azure:static-web-apps"] },
  "Azure Container Apps": { offerings: ["containers:microsoft-azure:container-apps"] },
  "Container Instances": { offerings: ["containers:microsoft-azure:container-instances"] },
  "Azure Kubernetes Service": { offerings: ["k8s:microsoft-azure:aks"] },
  "Azure Database for PostgreSQL": { offerings: ["postgres:microsoft-azure:database-for-postgresql"] },
  "Azure Database for MySQL": { offerings: ["mysql:microsoft-azure:database-for-mysql"] },
  "Azure Cosmos DB": { offerings: ["mongodb:microsoft-azure:cosmos-db-for-mongodb", "kv:microsoft-azure:cosmos-db", "graph:microsoft-azure:cosmos-db-gremlin"] },
  "SQL Database": { offerings: ["sqlserver:microsoft-azure:sql-database"] },
  "Redis Cache": { offerings: ["redis:microsoft-azure:cache-for-redis"] },
  Storage: { offerings: ["object:microsoft-azure:blob-storage", "block:microsoft-azure:managed-disks", "file:microsoft-azure:files", "archive:microsoft-azure:archive-blob"], skip: (i) => /reserved/i.test(i.skuName), maxPages: 15 },
  "Load Balancer": { offerings: ["lb:microsoft-azure:load-balancer-app-gateway"] },
  "Application Gateway": { offerings: ["lb:microsoft-azure:load-balancer-app-gateway", "waf:microsoft-azure:waf"] },
  "Azure Front Door Service": { offerings: ["cdn:microsoft-azure:front-door"] },
  "Content Delivery Network": { offerings: ["cdn:microsoft-azure:front-door"] },
  "API Management": { offerings: ["apigw:microsoft-azure:api-management"] },
  "Azure DNS": { offerings: ["dns:microsoft-azure:dns"] },
  "Azure Firewall": { offerings: ["waf:microsoft-azure:waf"] },
  Bandwidth: { offerings: ["egress:microsoft-azure:bandwidth"] },
  "Service Bus": { offerings: ["queue:microsoft-azure:service-bus"] },
  "Event Grid": { offerings: ["pubsub:microsoft-azure:event-grid"] },
  "Event Hubs": { offerings: ["stream:microsoft-azure:event-hubs"] },
  "Logic Apps": { offerings: ["workflow:microsoft-azure:logic-apps"] },
  "Azure Synapse Analytics": { offerings: ["warehouse:microsoft-azure:synapse-analytics", "spark:microsoft-azure:hdinsight-synapse-spark"] },
  HDInsight: { offerings: ["spark:microsoft-azure:hdinsight-synapse-spark"] },
  "Stream Analytics": { offerings: ["streamproc:microsoft-azure:stream-analytics"] },
  "Azure Data Factory v2": { offerings: ["etl:microsoft-azure:data-factory"] },
  "Microsoft Fabric": { offerings: ["lakehouse:microsoft-azure:fabric"] },
  "Azure Cognitive Search": { offerings: ["search:microsoft-azure:ai-search"] },
  "Foundry Models": { offerings: ["llm:microsoft-azure:openai-service", "embeddings:openai:embeddings"], maxPages: 3 },
  "Foundry Tools": { offerings: ["speech:microsoft-azure:ai-speech", "vision:microsoft-azure:document-intelligence"] },
  "Azure Monitor": { offerings: ["logs:microsoft-azure:monitor-logs", "metrics:microsoft-azure:application-insights"] },
  "Application Insights": { offerings: ["metrics:microsoft-azure:application-insights"] },
  "Key Vault": { offerings: ["secrets:microsoft-azure:key-vault"] },
  "Container Registry": { offerings: ["registry:microsoft-azure:container-registry"] },
  "IoT Hub": { offerings: ["iot:microsoft-azure:iot-hub"] },
  "Azure Machine Learning": { offerings: ["mltrain:microsoft-azure:machine-learning"] },
  Backup: { offerings: ["backup:microsoft-azure:backup"] },
  "Azure Data Explorer": { offerings: ["timeseries:azure:data-explorer"] },
  "Azure Maps": { offerings: ["maps:azure:maps"] },
  "Microsoft Entra": { offerings: ["auth:microsoft:entra-external-id"] },
};

export async function run(only) {
  await mkdir(OUT_DIR, { recursive: true });
  const summary = {};
  for (const [name, cfg] of Object.entries(AZURE_SERVICES)) {
    if (only?.length && !only.includes(name)) continue;
    const filter = `serviceName eq '${name}' and priceType eq 'Consumption' and (armRegionName eq 'eastus' or armRegionName eq 'Global' or armRegionName eq '')`;
    let url = `${API}?$filter=${encodeURIComponent(filter)}`;
    const rates = [];
    for (let page = 0; url && page < (cfg.maxPages ?? 12); page++) {
      const j = await getJson(url);
      for (const i of j.Items) if (!cfg.skip?.(i)) rates.push({ meterId: i.meterId, product: i.productName, sku: i.skuName, meter: i.meterName, region: i.armRegionName || "global", unit: i.unitOfMeasure, usd: i.retailPrice, tierMin: i.tierMinimumUnits, effective: i.effectiveStartDate, type: i.type, armSku: i.armSkuName });
      url = j.NextPageLink;
    }
    const file = `azure__${name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.json`;
    await writeFile(join(OUT_DIR, file), JSON.stringify({ provider: "microsoft-azure", service: name, offerings: cfg.offerings, region: "eastus + global", currency: "USD", fetchedAt: new Date().toISOString(), status: "pending", source: API, truncated: !!url, count: rates.length, rates }));
    summary[name] = rates.length + (url ? "+" : "");
  }
  return summary;
}
