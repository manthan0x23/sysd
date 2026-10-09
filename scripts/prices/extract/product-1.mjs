import { write, plan } from "./lib.mjs";

write("growthbook", [plan("flags:growthbook:cloud", "Pro", 40, "seat-month", { note: "Managed warehouse beyond 2M events $30/M; CDN beyond 2M requests $10/M, bandwidth $1/GB beyond 20GB." })]);
write("amplitude", [plan("analytics:amplitude:analytics", "Plus", 0, "month", { note: "'Starts at $0'; Growth and Enterprise by quote on the page." })]);
write("mixpanel", [], { notes: "Only a '$120 per month' / '$140 per month' pair (monthly vs yearly billing?) appears, with no plan name in the scrape; not recorded." });
write("plausible", [
  plan("analytics:plausible:analytics", "Starter", 9, "month", { note: "Monthly billing price $9 ($90/yr, ~$7.50/mo annual). Price depends on monthly pageviews; band not captured." }),
  plan("analytics:plausible:analytics", "Growth", 14, "month", { note: "Monthly $14 ($140/yr)." }),
  plan("analytics:plausible:analytics", "Business", 19, "month", { note: "Monthly $19 ($190/yr)." }),
], { notes: "Plans: Starter, Growth, Business (Enterprise by quote). Monthly-billing prices at the default pageview band." });
write("heap", [], { notes: "No pricing in scrape (quote-based)." });
write("rudderstack", [plan("analytics:rudderstack:cdp", "Free", 0, "month", { note: "Paid plans not captured." })]);
write("flagsmith", [], { notes: "Scrape returned no content." });
write("unleash", [], { notes: "Scrape returned no content." });
