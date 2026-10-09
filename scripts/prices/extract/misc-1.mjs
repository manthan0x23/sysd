import { write, plan } from "./lib.mjs";

write("trigger-dev", [plan("worker:trigger-dev:tasks", "Free", 0, "month", { note: "$5/month free usage credit." }), plan("worker:trigger-dev:tasks", "Hobby", 10, "month", { note: "$10/month credits included." }), plan("worker:trigger-dev:tasks", "Pro", 50, "month", { note: "$50/month credits included; extra seats $10/month per 50." })], { notes: "Compute billed per second by machine size (Micro 0.25 vCPU / 0.25 GB $0.0000169/s; Small 1x 0.5/0.5 $0.0000338/s; larger sizes in page table)." });
write("microsoft", [plan("bi:microsoft:power-bi", "Power BI Pro", 14, "user-month"), plan("bi:microsoft:power-bi", "Power BI Premium Per User", 24, "user-month")], { notes: "Entra External ID pricing not on this page." });
write("openrouter", [
  plan("llm:openrouter:router", "Free", 0, "month", { note: "25+ free models; 50 requests/day." }),
  { offerings: ["llm:openrouter:router"], tier: "Standard", spec: { models: "500+" }, rates: [{ name: "platform fee", amount: 5.5, unit: "percent" }], note: "BYOK: $25,000 of list-price inference/month with no fee, 5% after." },
  { offerings: ["llm:openrouter:router"], tier: "Business", spec: { models: "500+" }, rates: [{ name: "platform fee", amount: 8, unit: "percent" }] },
], { notes: "OpenRouter passes through each model provider's price and adds the platform fee on top. Enterprise: fee discounts by quote." });
write("baseten", [], { notes: "Model API token prices appeared but model names were not attached in the scrape; dedicated GPU rates not parsed. Not recorded." });
write("msg91", [], { notes: "Scrape returned a feature matrix without prices." });
write("gupshup", [], { notes: "Scrape returned no prices." });
for (const p of ["veeam", "rubrik", "akamai", "redpanda", "groq"]) write(p, [], { notes: "Scrape returned a tiny/blocked page (<2 KB); needs a different URL or a JS-rendering fetch." });
