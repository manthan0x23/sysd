import { write, plan } from "./lib.mjs";

write("auth0", [plan("auth:auth0:customer-identity", "Free", 0, "month"), plan("auth:auth0:customer-identity", "Essentials", 35, "month"), plan("auth:auth0:customer-identity", "Professional", 240, "month")], { notes: "Prices shown for the default MAU band on the page; price scales with monthly active users (band not captured)." });
write("workos", [plan("auth:workos:authkit-sso", "SSO / Directory connection", 125, "month", { note: "$125 per connection per month at low volume, tiering down to $100 / $80 / $65 at higher volume." })]);
write("clerk", [plan("auth:clerk:auth", "Hobby", 0, "month", { spec: { dashboardSeats: 3 } }), plan("auth:clerk:auth", "Pro", 20, "month", { spec: { mruIncluded: 50000 }, note: "Billed annually. Enhanced add-on $100/mo ($85 annual)." }), plan("auth:clerk:auth", "Business", 250, "month", { note: "Billed annually." })], { notes: "MRU = monthly retained users; per-MRU overage not captured." });
write("launchdarkly", [plan("flags:launchdarkly:feature-management", "Service connections", null, "month", { rates: [["per service connection (billed yearly)", 10, "other"], ["per 1k client-side MAU (billed yearly)", 8.33, "other"]], note: "Per-month unit prices as shown; monthly billing is higher ($12 / $10 per 1K MAU)." })]);
write("statsig", [plan("flags:statsig:experiments", "Pro", 150, "month", { note: "5M events included, then $0.05 per 1K events." })]);
write("posthog", [], { notes: "Pay-as-you-go with per-product free tiers; product rates (events, replays, flags) are in a calculator not captured in usable form." });
write("okta", [], { notes: "Scrape returned no prices (quote-based / JS)." });
write("1password", [], { notes: "Scrape returned no prices." });
