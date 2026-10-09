import { write, plan } from "./lib.mjs";

const graf = ["logs:grafana:cloud-loki", "metrics:grafana:cloud", "tracing:grafana:cloud-tempo", "timeseries:grafana:mimir-cloud"];
write("grafana", [
  plan(graf, "Free", 0, "month"),
  plan(graf, "Pro", 19, "month", { note: "'From $19/month + usage'. Example estimate on page: $195/month at $6.50 per 1k series." }),
  plan(graf, "Advanced", 25000, "year", { note: "'Starts at $25,000/year spend commit'." }),
]);
write("new-relic", [plan(["logs:new-relic:logs", "metrics:new-relic:full-stack"], "Standard (usage)", null, "gb", { rates: [["data ingest beyond 100 GB free/month", 0.4, "gb"]], note: "100 GB free ingest per month. User seat prices not captured." })]);
write("dynatrace", [plan("metrics:dynatrace:platform", "Grail data rates", null, "gb", { rates: [["ingest & process", 0.2, "gb"], ["retain (per GB-day)", 0.0007, "other"], ["query (per GB scanned)", 0.0035, "gb"]], note: "Units for retain/query inferred from Dynatrace's model; page lines show only the numbers. Verify before relying on them." })]);
write("splunk", [
  plan("logs:splunk:cloud", "Observability Cloud", 15, "month", { note: "'Starting at $15 per host per month' (per host)." }),
], { notes: "Splunk Cloud Platform (logs) is quote-based; AppDynamics from $6/CPU-core/month annually." });
write("better-stack", [
  plan("logs:better-stack:logs", "Free", 0, "month"),
  plan("uptime:better-stack:uptime", "Responder licence", 9, "user-month", { note: "$9 per responder per month; extra status page $15/month ($12 annually). Paid telemetry plans start around $29-$34 (labels not captured)." }),
]);
write("axiom", [plan("logs:axiom:logs", "Personal", 0, "month"), plan("logs:axiom:logs", "Axiom Cloud", 25, "month", { note: "Platform fee $25/month + usage; RBAC $50/mo, extended audit logs $50/mo, SAML SSO $100/mo add-ons." })]);
write("papertrail", [plan("logs:papertrail:logs", "Entry plan (from)", 5, "month", { note: "'Starts at $5.00'." })]);
write("honeycomb", [
  plan(["metrics:honeycomb:observability", "tracing:honeycomb:tracing"], "Pro", 150, "month", { note: "'Starting at $150/month' for 50M events (up to 750M) and 250M time-series points (up to 3.75B). Telemetry from $0.10/GB." }),
]);
