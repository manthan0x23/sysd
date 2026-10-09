import { write, plan } from "./lib.mjs";

write("sentry", [plan("errors:sentry:errors", "Developer (free)", 0, "month"), plan("errors:sentry:errors", "Team", 26, "month"), plan("errors:sentry:errors", "Business", 80, "month"), plan("errors:sentry:errors", "Seer add-on", 40, "user-month", { note: "'$40/active contributor/month'." })], { notes: "Prices as shown (monthly; annual is cheaper). Event quotas and overage rates not captured." });
write("pingdom", [plan("uptime:pingdom:monitoring", "Synthetic Monitoring (from)", 16.5, "month", { note: "'Starting at $16.5/mo'. RUM listed at $198/year-ish tier; not recorded." })]);
write("uptimerobot", [
  plan("uptime:uptimerobot:monitoring", "Free", 0, "month"),
  plan("uptime:uptimerobot:monitoring", "Solo", 12, "month", { note: "'Starts at $144/year'; monthly price $12 derived = 144/12." }),
  plan("uptime:uptimerobot:monitoring", "Team", 39, "month", { note: "'$46 (list) / $39 per month' shown as 'most popular'; $468/year." }),
], { notes: "Scale plan starts at a price cut off in the scrape. SMS/voice credits: 10 for $3, 100 for $15, 200 for $25, 500 for $55." });
write("circleci", [plan("ci:circleci:cloud", "Free", 0, "month"), plan("ci:circleci:cloud", "Performance", 15, "month", { note: "'Starting at $15/month'; extra credits $15 per 25,000; network/storage beyond limits 420 credits/GB ($0.252/GB)." })]);
write("gitlab", [plan("ci:gitlab:ci-cd", "Free", 0, "user-month"), plan("ci:gitlab:ci-cd", "Premium", 29, "user-month", { note: "Includes $12 GitLab Credits (AI) per user/month. Ultimate price not captured (shown as contact/`$24 credits`)." })]);
write("buildkite", [plan("ci:buildkite:pipelines", "Hosted agents", null, "minute", { rates: [["Linux hosted agent", 0.004, "minute"], ["Mac hosted agent", 0.02, "minute"], ["extra agent per month", 3.5, "other"], ["Test Engine executions", 15, "1m-events"]] })], { notes: "Plan base fees not captured." });
write("docker", [
  plan("registry:docker:hub", "Personal", 0, "user-month"), plan("registry:docker:hub", "Pro", 11, "user-month", { note: "$9/user/month on annual plan." }),
  plan("registry:docker:hub", "Team", 16, "user-month", { note: "$15/user/month on annual plan." }), plan("registry:docker:hub", "Business", 24, "user-month", { note: "Annual plan price; monthly plan not offered at this price on the page." }),
]);
write("lightstep", [], { notes: "Scrape returned no content (docs URL)." });
