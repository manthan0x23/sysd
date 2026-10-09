import { write, plan } from "./lib.mjs";

write("clickhouse", [
  plan("warehouse:clickhouse:cloud", "Basic", 53, "month", { spec: { storageTbMax: 1, memoryGibTotal: "8-12" }, rates: [["storage", 25.3, "tb-month"], ["compute", 0.2181, "unit-hour"]], note: "'From $53/month'; storage up to 1 TB." }),
  plan("warehouse:clickhouse:cloud", "Scale", 437, "month", { rates: [["storage", 25.3, "tb-month"], ["compute", 0.2985, "unit-hour"]], note: "'From $437/month'." }),
  plan("warehouse:clickhouse:cloud", "Enterprise", 571, "month", { note: "'From $571/month'." }),
], { notes: "Compute billed per 'unit' (8 GiB RAM unit; unit size inferred, not on the scraped lines)." });

write("databricks", [
  plan("lakehouse:databricks:lakehouse-platform", "Data engineering (Jobs), starting at", null, "month", { rates: [["DBU", 0.15, "other"]] }),
  plan("warehouse:databricks:sql-warehouse", "SQL Classic", null, "month", { rates: [["DBU", 0.22, "other"]] }),
  plan("warehouse:databricks:sql-warehouse", "SQL Pro", null, "month", { rates: [["DBU", 0.55, "other"]] }),
  plan("warehouse:databricks:sql-warehouse", "SQL Serverless", null, "month", { rates: [["DBU (list)", 0.7, "other"], ["DBU (promo)", 0.55, "other"]], note: "Promotion: 30% off the list price shown on the page." }),
  plan("spark:databricks:jobs-compute", "Jobs compute, starting at", null, "month", { rates: [["DBU", 0.15, "other"]] }),
  plan("mltrain:databricks:mosaic-ai", "AI, starting at", null, "month", { rates: [["DBU", 0.07, "other"]] }),
], { notes: "Prices are per DBU (Databricks Unit) per hour, plus the underlying cloud VM cost for classic compute. Rates vary by cloud and tier." });

write("motherduck", [plan("warehouse:motherduck:duckdb-cloud", "Free (from $0)", 0, "month"), plan("warehouse:motherduck:duckdb-cloud", "Business", 250, "month", { note: "$250 per org per month plus usage; 1 AI Unit = $1.00." })]);
write("materialize", [plan("streamproc:materialize:cloud", "On-demand", null, "month", { rates: [["compute credit", 1.5, "other"]] })], { notes: "$1.50 per compute credit, on-demand SaaS." });
write("snowflake", [], { notes: "Credit price depends on edition/cloud/region and is in an interactive table not captured." });
write("firebolt", [], { notes: "Scrape returned a near-empty page." });
