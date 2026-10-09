import { raw, tables, num, gib, write, plan, vps } from "./lib.mjs";

write("aiven", [
  plan("postgres:aiven:postgresql", "Free", 0, "month"),
  plan("postgres:aiven:postgresql", "Developer", 5, "month"),
  plan("postgres:aiven:postgresql", "Hobbyist (from)", 12, "month", { hourly: 0.02 }),
  plan("postgres:aiven:postgresql", "Startup (from)", 75, "month", { hourly: 0.1 }),
  plan("postgres:aiven:postgresql", "Business (from)", 180, "month", { hourly: 0.25 }),
], { notes: "PostgreSQL plans only. Premium tier price and the MySQL / Valkey / Kafka plans on Aiven's separate pages not captured." });

const xt = tables(raw("xata", 1)).flatMap((t) => t.rows).filter((r) => /^(micro|small|medium|large|xlarge|2xlarge|4xlarge|8xlarge)/.test(Object.values(r)[0] ?? ""));
write("xata", xt.map((r) => { const v = Object.values(r); return vps("postgres:xata:postgres", v[0], num(v[1]), gib(v[2]), undefined, num(v[4]), { hourly: num(v[3]), vcpuNote: v[1] }); }), { notes: "Storage $0.28/GB-month on top of instance price." });

write("checkly", [plan("uptime:checkly:synthetics", "Hobby", 0, "month"), plan("uptime:checkly:synthetics", "Starter", 24, "month", { note: "Billed annually; monthly billing price is higher." }), plan("uptime:checkly:synthetics", "Team", 64, "month", { note: "Billed annually." })]);
write("hashicorp", [plan("secrets:hashicorp:hcp-vault", "HCP Vault Dedicated (smallest cluster, from)", null, "hour", { rates: [["per cluster", 0.62, "hour"]], note: "Second tier starts at $1.58 per cluster-hour. $500 credit for new accounts." })]);
write("ory", [plan("auth:ory:network", "Ory Network (smallest paid, yearly)", 770, "year", { note: "Growth: $9,350/year. Plan names for the $770 plan not captured." })], { notes: "Billed yearly; monthly option shown on page but price not captured." });
write("stytch", [plan("auth:stytch:auth", "Pay as you go", 0, "month", { note: "Free base; custom email branding add-on $99." })]);
write("hex", [plan("bi:hex:platform", "Professional", 36, "user-month", { note: "Per editor per month." }), plan("bi:hex:platform", "Team", 75, "user-month", { note: "Per editor per month." })], { notes: "Compute profiles priced per hour: Large $0.32, Extra large $0.65, 2XL $1.29, 4XL $2.58, A10G GPU $4.06 (CPU/RAM columns not labelled)." });
write("tencent-cloud", [], { notes: "Scrape returned a marketing page without readable instance prices." });
write("infisical", [], { notes: "Not fetched (rate-limited); pending." });
