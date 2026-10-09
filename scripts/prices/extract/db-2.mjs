import { raw, tables, num, write, plan } from "./lib.mjs";

write("neo4j", [
  plan("graph:neo4j:auradb", "AuraDB Free", 0, "month"),
  plan("graph:neo4j:auradb", "AuraDB Professional", null, "month", { rates: [["memory", 0.09, "gb-hour"]], spec: { minInstanceGb: 1 } }),
  plan("graph:neo4j:auradb", "AuraDB Business Critical", null, "month", { rates: [["memory", 0.2, "gb-hour"]], spec: { minInstanceGb: 2 } }),
  plan("graph:neo4j:auradb", "AuraDB Virtual Dedicated Cloud", null, "month", { contact: true, note: "Custom pricing." }),
], { notes: "Capacity-based: price per GB of instance memory per hour. 'Aura Graph Analytics' is $0.40/GB/hour (separate product)." });

write("couchbase", [
  plan("mongodb:couchbase:capella", "Free", 0, "month", { spec: { nodes: 1, storageGb: 8 } }),
  plan("mongodb:couchbase:capella", "Basic", null, "hour", { rates: [["per node, from", 0.15, "hour"]] }),
  plan("mongodb:couchbase:capella", "Developer Pro", null, "hour", { rates: [["per node, from", 0.35, "hour"]] }),
  plan("mongodb:couchbase:capella", "Enterprise", null, "hour", { rates: [["per node, from", 0.49, "hour"]], spec: { minNodes: 3 } }),
], { notes: "Per-node hourly 'from' prices. A detailed table on the page lists node sizes (e.g. 2 vCPU / 8 GB at $0.15/hr, 4 vCPU / 16 GB at $0.29/hr) but its columns were not labelled in the scrape." });

write("prisma", [
  plan("postgres:prisma:postgres", "Free", 0, "month", { spec: { operations: 200000, storageGb: 1.01, databases: 50 }, note: "Includes Prisma Compute allowance: 1M requests, 360 GB-hours memory, 4 vCPU-hours, 10 GB egress." }),
  plan("postgres:prisma:postgres", "Starter", 10, "month", { spec: { operations: 1000000, storageGb: 10, databases: 1000 }, rates: [["extra operations", 8, "1m-requests"], ["extra storage", 2, "gb-month"]] }),
  plan("postgres:prisma:postgres", "Pro", 49, "month", { spec: { operations: 10000000, storageGb: 50 }, rates: [["extra operations", 2, "1m-requests"], ["extra storage", 1.5, "gb-month"]] }),
  plan("postgres:prisma:postgres", "Business", 129, "month", { spec: { operations: 50000000, storageGb: 100 }, rates: [["extra operations", 1, "1m-requests"]] }),
], { notes: "Operations-based pricing for Prisma Postgres. Prisma Compute (separate hosting product on the same plan): $0.006/GB-hour memory, $0.064/active vCPU-hour, $0.025/GB egress, $1 per million requests beyond allowance." });

write("tigergraph", tables(raw("tigergraph", 1)).flatMap((t) => t.rows).filter((r) => r.Instance && num(r["Price (per Hour)"]) !== undefined).map((r) => plan("graph:tigergraph:savanna", r.Instance, Math.round(num(r["Price (per Hour)"]) * 730), "month", { spec: { vcpu: num(r.CPU), ramGb: num(r["Memory (GB)"]) }, hourly: num(r["Price (per Hour)"]), note: "monthly = hourly x 730" })), { notes: "Savanna storage $0.025 per GB-month. Free tier exists; up to 32 vCPUs / 256 GB per workspace." });

write("bunny", [
  plan("cdn:bunny:cdn", "Standard network (119 PoPs)", null, "gb", { rates: [["from", 0.01, "gb"]], note: "Regional prices $0.01 to $0.06/GB; region labels not captured. $1 monthly minimum." }),
  plan("cdn:bunny:cdn", "Volume network (10 PoPs)", null, "gb", { rates: [["first 500 TB", 0.005, "gb"], ["500 TB - 1 PB", 0.004, "gb"], ["above", 0.002, "gb"]] }),
  plan("media:bunny:stream", "Stream", null, "minute", { rates: [["encoding from", 0.02, "minute-video"], ["storage from", 0.01, "gb-month"]], note: "Player, transcoding and security features free; $1 monthly minimum." }),
  plan("sqlite:bunny:database", "Bunny Database", null, "month", { rates: [["rows read", 0.3, "1m-requests"], ["rows written", 0.3, "1m-requests"], ["storage per active region", 0.1, "gb-month"]], note: "Free during public preview. Page also lists '$0.30 per billion rows' (reads)." }),
  plan("images:bunny:optimizer", "Optimizer", 9.5, "month", { note: "$9.5/month per website." }),
], { notes: "Rates only; Bunny database read price is per billion rows on the page (per-million figure above is the writes line)." });
write("datastax", [], { notes: "Scraped URL (datastax.com/pricing/astra-db) redirected to IBM watsonx.data pricing. Astra DB prices NOT captured; needs a new source URL." });
write("tembo", [], { notes: "Scraped URL now shows Tembo's AI-coding-agent platform (Free / Pro $60 / Max $200), not Postgres hosting. Tembo Cloud (Postgres) prices NOT captured." });
write("arangodb", [], { notes: "Page is marketing only; no prices on it." });
write("memgraph", [], { notes: "Page shows 'free, forever' open source and enterprise by quote; no list prices." });
write("ferretdb", [], { notes: "Scrape returned no usable content." });
write("scylladb", [], { notes: "Pricing is behind an interactive calculator; no list prices on the page." });
