import { write, plan } from "./lib.mjs";

write("pinecone", [
  plan("vector:pinecone:serverless", "Starter", 0, "month"),
  plan("vector:pinecone:serverless", "Builder", 20, "month", { note: "'$20/month flat'." }),
  plan("vector:pinecone:serverless", "Standard", 50, "month", { note: "'$50 monthly minimum applied to usage'; anything over is pay-as-you-go. Per-unit read/write/storage rates are in docs, not captured." }),
  plan("vector:pinecone:serverless", "Enterprise", null, "month", { contact: true, note: "Minimum spend not captured." }),
]);
write("qdrant", [
  plan("vector:qdrant:cloud", "Free tier", 0, "month", { spec: { vcpu: 0.5, ramGb: 1, diskGb: 4, nodes: 1 } }),
  plan("vector:qdrant:cloud", "Standard (usage-based)", null, "month", { contact: true, note: "Usage-based; rates are in the calculator (cloud.qdrant.io/calculator), not on the page." }),
  plan("vector:qdrant:cloud", "Premium", null, "month", { contact: true, note: "Minimum spend required." }),
]);
write("weaviate", [
  plan("vector:weaviate:cloud", "Free", 0, "month"),
  plan("vector:weaviate:cloud", "Flex", 45, "month", { note: "'Starts at $45/mo'." }),
], { notes: "Database AI services (embedding) from $0.025 per 1M tokens. $30/organization monthly plan appears for an add-on." });
write("zilliz", [
  plan("vector:zilliz:cloud-milvus", "Free", 0, "month"),
  plan("vector:zilliz:cloud-milvus", "Standard (serverless)", 0, "month", { note: "'From $0/month'; usage-based." }),
  plan("vector:zilliz:cloud-milvus", "Enterprise (dedicated)", 197, "month", { note: "'From $197/month' (dedicated)." }),
], { notes: "Page also shows 'From $126/GB/month (Dedicated)' under Standard, which looks like a mis-scrape of a $126/month CU price; not used. Example storage $0.10 (unit not captured)." });
write("turbopuffer", [
  plan("vector:turbopuffer:vector-db", "Launch", 16, "month", { note: "Minimum usage per month." }),
  plan("vector:turbopuffer:vector-db", "Scale", 256, "month", { note: "Minimum usage per month." }),
], { notes: "Per-GB and per-query rates are in a calculator, not captured." });
write("chroma", [
  plan("vector:chroma:cloud", "Starter", 0, "month", { note: "$5 free credits, then usage.", rates: [["write", 2.5, "gb"], ["storage", 0.33, "gb-month"], ["query (per TiB queried)", 0.0075, "tb"], ["network out", 0.09, "gb"]] }),
]);
write("typesense", [plan("search:typesense:cloud", "Cluster", 21.6, "month", { hourly: 0.03, rates: [["bandwidth out", 0.09, "gb"]], note: "$0.03/hr per the smallest cluster shown; monthly = $21.60 as printed on the page." })]);
write("meilisearch", [
  plan("search:meilisearch:cloud", "Build (from)", 30, "month", { note: "Usage-based; base plan includes 100K docs and 50K searches at $30/month. 'Starting at $20/month' also appears (a smaller plan)." }),
  plan("search:meilisearch:cloud", "Resource-based example", 23, "month", { note: "Example: instance $18/mo + disk $5/mo (32 GiB billed)." }),
]);
