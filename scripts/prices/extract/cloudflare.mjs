import { write, plan } from "./lib.mjs";

const planOff = ["cdn:cloudflare:cdn", "dns:cloudflare:dns", "waf:cloudflare:waf-ddos", "egress:cloudflare:no-egress-fees"];
write("cloudflare", [
  plan(planOff, "Free", 0, "month"),
  plan(planOff, "Pro", 20, "month", { note: "Billed annually; $25/month billed monthly." }),
  plan(planOff, "Business", 200, "month", { note: "Billed annually; $250/month billed monthly." }),
  plan(planOff, "Enterprise", null, "month", { contact: true }),
  plan("fn:cloudflare:workers", "Workers Paid", null, "month", { rates: [["requests", 0.3, "1m-requests"], ["CPU time per million ms", 0.02, "other"]], note: "Free plan: 100k requests/day, 10 ms CPU per request. Page lists '$7/user/month' pay-as-you-go seat (unlabelled)." }),
  plan("kv:cloudflare:kv", "Workers KV (Paid)", null, "month", { rates: [["reads beyond 10M/month", 0.5, "1m-requests"], ["writes beyond 1M/month", 5, "1m-requests"], ["deletes beyond 1M/month", 5, "1m-requests"], ["list requests beyond 1M/month", 5, "1m-requests"], ["stored data beyond 1 GB", 0.5, "gb-month"]], note: "Free plan: 100k reads/day, 1k writes/day, 1 GB." }),
  plan("sqlite:cloudflare:d1", "D1 (Paid)", null, "month", { rates: [["rows read beyond 25B/month", 0.001, "1m-requests"], ["rows written beyond 50M/month", 1, "1m-requests"], ["storage beyond 5 GB", 0.75, "gb-month"]], note: "Free plan: 5M rows read/day, 100k written/day, 5 GB." }),
  plan("queue:cloudflare:queues", "Queues (Paid)", null, "month", { rates: [["operations beyond 1M/month", 0.4, "1m-requests"]], note: "Free plan: 10,000 operations/day. Each message = 3 operations (write, read, delete). Retention 4 days default (up to 14)." }),
  plan("media:cloudflare:stream", "Stream", null, "minute", { rates: [["delivery per 1,000 minutes", 1, "other"], ["storage per 1,000 minutes capacity per month", 5, "other"]], note: "Ingress and encoding free; bandwidth included in delivery." }),
  plan("images:cloudflare:images", "Images", null, "month", { rates: [["transformations beyond 5,000 free, per 1,000", 0.5, "other"], ["storage per 100k images per month", 5, "other"], ["delivery per 100k images", 1, "other"]] }),
  plan("rtc:cloudflare:realtime", "Realtime (SFU + TURN)", null, "gb", { rates: [["egress beyond 1,000 GB/month free", 0.05, "gb"]] }),
], { notes: "Pages Functions share the Workers quota; static asset requests are free. R2 (previously scraped 2026-10-08 in src/lib/pricing/data.ts), Load Balancing, API Gateway, Cron Triggers pages not fetched/parsed here." });
