import { raw, tables, num, gib, write, plan, vps } from "./lib.mjs";

// --- Supabase: compute add-on table (monthly price, CPU class, memory, connections), plus project plans
const sbRows = tables(raw("supabase", 1)).flatMap((t) => t.rows).filter((r) => /^(Micro|Small|Medium|Large|\d?XL|2XL|4XL|8XL|12XL|16XL)$/.test(Object.values(r)[0] ?? ""));
const sbSeen = new Set();
const sb = [
  plan(["baas:supabase:platform"], "Free", 0, "month"),
  plan(["baas:supabase:platform"], "Pro", 25, "month", { note: "Includes $10/month compute credit (covers one Micro). Additional projects from $10/month." }),
  plan(["baas:supabase:platform"], "Team", 599, "month"),
  ...sbRows.filter((r) => { const k = Object.values(r)[0]; if (sbSeen.has(k)) return false; sbSeen.add(k); return true; }).map((r) => { const v = Object.values(r); const m = String(v[2]).match(/(\d+) vCPU/); return vps(["postgres:supabase:database"], `Compute ${v[0]}`, m ? +m[1] : undefined, gib(v[3]), undefined, num(v[1]), { cpuClass: m ? "dedicated" : "shared", directConnections: num(v[4]), poolerConnections: num(v[5]) }); }),
  plan(["auth:supabase:auth"], "Auth MAU", null, "mau", { rates: [["per MAU beyond included", 0.00325, "mau"]] }),
];
write("supabase", sb, { notes: "Compute add-on table: monthly price per instance size. Storage, egress, and Edge Function rates not parsed here." });

// --- Appwrite Cloud: dedicated database compute tiers
const aw = tables(raw("appwrite", 1)).flatMap((t) => t.rows).filter((r) => /mo/.test(Object.values(r).at(-1) ?? "") && /core/.test(Object.values(r)[1] ?? ""));
write("appwrite", aw.map((r) => { const v = Object.values(r); return vps("baas:appwrite:cloud", v[0], num(v[1]), gib(v[2]), undefined, num(v[3])); }), { notes: "Dedicated database compute tiers. Appwrite plan fees (Free/Pro/Scale) not captured." });

// --- Deno Deploy
write("deno", [plan("fn:deno:deploy", "Free", 0, "month", { spec: { requestsPerMonth: "1M" } }), plan("fn:deno:deploy", "Pro", 20, "month", { spec: { requestsPerMonth: "5M" }, note: "Then $2 per million requests. KV storage beyond included $0.75/GiB." }), plan("fn:deno:deploy", "Builder", 200, "month", { note: "KV storage beyond included $0.75/GiB." })]);

// --- Netlify
write("netlify", [plan(["static:netlify:hosting", "fn:netlify:functions", "paas:netlify:platform"], "Free", 0, "month"), plan(["static:netlify:hosting", "fn:netlify:functions", "paas:netlify:platform"], "Personal", 9, "month"), plan(["static:netlify:hosting", "fn:netlify:functions", "paas:netlify:platform"], "Pro", 20, "month", { note: "'$20/month with' (per member; text cut off)." })], { notes: "Credit/usage allowances per plan not captured." });

// --- Convex
write("convex", [plan("baas:convex:platform", "Free / Starter", 0, "month", { note: "'Free or $0/month and pay as you go'." }), plan("baas:convex:platform", "Professional", 25, "user-month", { note: "$25 per developer per month." }), plan("baas:convex:platform", "Plan above Professional (name not captured)", 2500, "month", { note: "'$2,500 monthly minimum'; \"Everything in Professional, plus...\"." })]);
