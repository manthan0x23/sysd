import { raw, tables, num, write, plan } from "./lib.mjs";

const vOff = ["paas:vercel:platform", "static:vercel:hosting"];
const regional = tables(raw("vercel", 2)).flatMap((t) => t.rows).filter((r) => /\(\w+\d\)/.test(Object.values(r)[0] ?? ""));
write("vercel", [
  plan(vOff, "Hobby", 0, "month"),
  plan(vOff, "Pro", 20, "month", { note: "Includes $20 of usage credit per month. Per-seat pricing not captured in the scraped lines." }),
  ...regional.map((r) => { const v = Object.values(r); return plan("fn:vercel:functions", `Active CPU & memory: ${v[0]}`, null, "hour", { rates: [["active CPU", num(v[1]), "vcpu-hour"], ["provisioned memory", num(v[2]), "gb-ram-hour"]] }); }),
  plan("images:vercel:image-optimization", "Image optimization", null, "month", { rates: [["transformations, per 1K", 0.05, "1k-requests"], ["cache reads, per 1M", 0.4, "1m-requests"]], note: "Ranges on the page ($0.05-$0.0812 per 1K transformations; $0.40-$0.64 per 1M cache reads) depend on volume/region; the low end is recorded." }),
], { notes: "Function pricing is regional (CPU $/hour, memory $/GB-hour). Builds, Edge Network bandwidth, Cron Jobs limits not captured with certainty." });

const up = tables(raw("upstash", 1)).flatMap((t) => t.rows);
const upRedis = up.filter((r) => /^(Free|Pay as You Go|Fixed)/.test(Object.values(r)[0] ?? "") && /\$/.test(Object.values(r)[1] ?? ""));
write("upstash", [
  ...upRedis.map((r) => { const v = Object.values(r); const isPayg = /Pay/.test(v[0]); return plan(["redis:upstash:redis", "kv:upstash:redis-kv"], `Redis ${v[0]}`, isPayg ? null : num(v[1]), "month", { spec: { maxDataGb: /MB/.test(v[3]) ? num(v[3]) / 1024 : num(v[3]), bandwidthIncluded: v[4] }, ...(isPayg ? { rates: [["commands", 0.2, "other"], ["storage beyond 1 GB", 0.25, "gb-month"], ["bandwidth beyond 200 GB", 0.03, "gb"]], note: "$0.20 per 100K commands." } : { note: `${v[2]} per additional read region.` }) }); }),
  plan("queue:upstash:qstash", "QStash Free", 0, "month"),
  plan("queue:upstash:qstash", "QStash Pay as You Go", null, "month", { rates: [["messages per 100K", 1, "other"], ["bandwidth beyond 50 GB", 0.05, "gb"]] }),
  plan("queue:upstash:qstash", "QStash Fixed 1M", 180, "month"),
  plan("queue:upstash:qstash", "QStash Fixed 10M", 420, "month"),
], { notes: "Upstash Kafka page not captured (fetch pending/failed)." });
