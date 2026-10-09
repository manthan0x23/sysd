import { write, plan } from "./lib.mjs";

write("datadog", [
  plan("metrics:datadog:infrastructure-apm", "Infrastructure Free", 0, "month", { note: "Up to 5 hosts, 1-day metric retention." }),
  plan("metrics:datadog:infrastructure-apm", "Infrastructure Pro", 15, "month", { note: "Per host per month (annual billing)." }),
  plan("metrics:datadog:infrastructure-apm", "APM", 31, "month", { note: "Per host per month with Infrastructure attached, billed annually; $36 on-demand." }),
  plan(["tracing:datadog:apm-traces", "metrics:datadog:infrastructure-apm"], "APM Pro", 35, "month", { note: "Per host per month; adds Data Streams Monitoring." }),
  plan("logs:datadog:log-management", "Log ingest", null, "gb", { rates: [["ingested or scanned GB", 0.1, "gb"]], note: "Indexing priced separately per million events (retention-dependent) - not captured." }),
  plan("errors:datadog:error-tracking", "Error Tracking", null, "month", { contact: true, note: "Price not captured." }),
  plan("uptime:datadog:synthetics", "Synthetics", null, "month", { contact: true, note: "Price not captured." }),
], { notes: "Page is very large (350 KB); only the headline 'Starting At' prices were verified. Many per-feature prices exist." });
write("bugsnag", [plan("errors:bugsnag:errors", "Free", 0, "month"), plan("errors:bugsnag:errors", "Select", 20, "month", { note: "'Starting at $20/month' for smaller teams." }), plan("errors:bugsnag:errors", "Preferred", 33, "month", { note: "'Starting at $33/month' for larger teams." })]);
write("doppler", [plan("secrets:doppler:secrets", "Developer", 0, "month", { note: "Free for 3 users, then $8/month per additional user." }), plan("secrets:doppler:secrets", "Team", 21, "user-month")]);
write("rollbar", [plan("errors:rollbar:errors", "Free", 0, "month", { note: "'Plans starting at $0'; paid plan prices not captured." })]);
write("highlight", [], { notes: "Scrape had no plan prices." });
write("segment", [], { notes: "Scrape had no plan prices." });
