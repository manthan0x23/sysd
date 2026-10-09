import { write, plan } from "./lib.mjs";

write("cloudinary", [plan("images:cloudinary:media", "Free", 0, "month"), plan("images:cloudinary:media", "Plus", 99, "month", { note: "'Yearly $99 / Per month $89' appears; which one is monthly-billing vs annual-billing is not clear from the scrape." }), plan("images:cloudinary:media", "Advanced", null, "month", { contact: true, note: "Price not captured." })]);
write("imgix", [plan("images:imgix:rendering", "Starter tier (monthly)", 25, "month", { note: "Also $250/yr. Next tiers $75/mo ($750/yr) and $150/mo; plan names not captured." }), plan("images:imgix:rendering", "Second tier (monthly)", 75, "month"), plan("images:imgix:rendering", "Third tier (monthly)", 150, "month")], { notes: "Credit-based; tier names not captured." });
write("api-video", [], { notes: "Only 'as low as $0.00285 / $0.0017' per-minute figures and monthly plan prices ($33 yearly-billing etc.) without plan names; not recorded." });
write("vimeo", [], { notes: "Scrape returned 136 bytes (blocked)." });
write("hivemq", [plan("iot:hivemq:cloud", "Launch (self-managed software)", 299, "month", { note: "1 broker deployment, community support." }), plan("iot:hivemq:cloud", "Next plan up", 499, "month", { note: "Plan name not confirmed (likely 'Run' by page order)." })], { notes: "Cloud (managed) usage price starts $0.34/hour + $0.80/million messages for the Agentic AI Ops add-on only; managed MQTT cluster prices not captured." });
write("emqx", [plan("iot:emqx:cloud", "Serverless", 0, "month", { note: "'Starts at $0/month' with a free monthly quota, up to 1,000 connections; pay-as-you-go beyond." }), plan("iot:emqx:cloud", "Dedicated Flex (from)", 234, "month", { note: "'Starts at $234/month'." })]);
write("particle", [], { notes: "Scrape had no plan prices." });
write("roboflow", [plan("vision:roboflow:platform", "Free", 0, "month"), plan("vision:roboflow:platform", "Core", 39, "month", { note: "Credit packs: +10 credits $39 ($3.90/credit), +25 credits $89, +40 credits $139." })]);
write("weights-biases", [plan("mltrain:weights-biases:platform", "Pro (from)", 5, "month", { note: "'$5/mo' appears; page also says free forever for academic research. Per-seat pricing not confirmed." })]);
write("starburst", [], { notes: "Scrape had no prices." });
write("ververica", [], { notes: "Scrape had no prices." });
write("decodable", [plan("streamproc:decodable:platform", "Credits", null, "month", { rates: [["per credit (pay as you go)", 0.12, "other"], ["per credit (commit)", 0.1, "other"]] })]);
write("preset", [plan("bi:preset:superset-cloud", "Starter", 0, "month", { note: "Free for up to 5 users." }), plan("bi:preset:superset-cloud", "Professional", 25, "user-month", { note: "'$25/user/month billed monthly'." })]);
