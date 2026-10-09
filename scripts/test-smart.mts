// Checks the canvas rules: link validity, copies and autoscaling, cache and CDN hit rates, queue backlog.
import { checkLink } from "../src/lib/catalog/connections";
import { defaultOffering } from "../src/lib/catalog/offerings";
import { fromDoc, toDoc, type DesignDoc } from "../src/lib/doc";
import { analyze } from "../src/lib/analysis";
import { parseDoc } from "../src/server/doc";
import { DEFAULT_WORKLOAD } from "../src/lib/sim";
import { useStudio } from "../src/store/useStudio";

let bad = 0;
const eq = (name: string, got: unknown, want: unknown) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) { bad++; console.log(`FAIL ${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); } };
const near = (name: string, got: number, want: number, tol = 0.01) => { if (Math.abs(got - want) > tol * Math.max(1, Math.abs(want))) { bad++; console.log(`FAIL ${name}: got ${got}, want ~${want}`); } };

// ---- link rules (source type, target type, valid?)
const pairs: [string, string, boolean][] = [
  ["client", "cdn", true], ["client", "lb", true], ["lb", "fn", true], ["fn", "redis", true], ["fn", "postgres", true], ["fn", "queue", true], ["queue", "worker", true],
  ["cdn", "object", true], ["fn", "object", true], ["postgres", "postgres", true], ["fn", "llm", true],
  ["redis", "cdn", false], ["redis", "fn", false], ["postgres", "lb", false], ["postgres", "fn", false], ["client", "postgres", false], ["client", "redis", false],
  ["fn", "cdn", false], ["fn", "vps", false], ["fn", "client", false], ["object", "client", false],
];
for (const [a, b, ok] of pairs) eq(`link ${a}>${b}`, checkLink(a, b).ok, ok);
const r = checkLink("redis", "cdn"); eq("refusal gives a reason", !r.ok && r.reason.length > 10, true);

// The sample's "api" is a serverless function (pay per use, no copies), so the copy tests turn it into an app server.
const sample = () => { const s = useStudio.getState(); s.loadSample(); return useStudio.getState(); };
const asApp = () => {
  const o = defaultOffering("app")!;
  useStudio.setState((s) => ({ nodes: s.nodes.map((n) => (n.id === "api" ? { ...n, data: { ...n.data, typeId: "app", offeringId: o.id, planId: undefined } } : n)) }));
};
const run = () => { const s = useStudio.getState(); return analyze(s.nodes, s.edges, s.workload).sim; };

// ---- CDN hit rate replaces the hand-set 5%: sample numbers are unchanged, and the hit rate drives it
sample();
let sim = run();
near("cdn to storage at 95% hit", sim.edgeLoad["e-cdn-s3"], sim.load["cdn"] * 0.05);
useStudio.getState().setHitRate("cdn", 50);
sim = run();
near("cdn to storage at 50% hit", sim.edgeLoad["e-cdn-s3"], sim.load["cdn"] * 0.5);

// ---- cache hit rate decides what reaches the database
sample();
const dbAt = (hit: number) => { useStudio.getState().setHitRate("cache", hit); return run().load["db"]; };
const lo = dbAt(0), mid = dbAt(80), hi = dbAt(100);
if (!(lo > mid && mid > hi)) { bad++; console.log("FAIL db load should fall as hit rate rises", lo, mid, hi); }
near("db load at 100% hit = writes only", hi, 0.5 * 1200 * 0.1 * 1, 0.5); // half the traffic reaches the api; 10% writes

// ---- replicas divide load and multiply cost
sample();
asApp();
const base = run();
useStudio.getState().setReplicas("api", 3);
sim = run();
eq("api copies", sim.instances["api"], 3);
near("api util / 3", sim.util["api"]!, base.util["api"]! / 3);
const apiCost1 = base.nodeCost["api"], apiCost3 = sim.nodeCost["api"];
if (!(apiCost3 > apiCost1)) { bad++; console.log("FAIL cost should rise with copies", apiCost1, apiCost3); }

// ---- database read replicas: writes stay on the primary
sample();
const dbBase = run().util["db"]!;
useStudio.getState().setReplicas("db", 4);
const dbRep = run().util["db"]!;
if (!(dbRep < dbBase && dbRep > dbBase / 4)) { bad++; console.log("FAIL read replicas should help but not divide writes", dbBase, dbRep); }

// ---- autoscale follows the load and respects min/max
sample(); asApp();
useStudio.getState().setAutoscale("api", { min: 2, max: 6 });
useStudio.getState().setWorkload({ rps: 100 });
eq("autoscale min", run().instances["api"], 2);
useStudio.getState().setWorkload({ rps: 6000, peakRps: 8000 });
const mid2 = run().instances["api"];
if (!(mid2 > 2 && mid2 <= 6)) { bad++; console.log("FAIL autoscale should scale up", mid2); }
useStudio.getState().setWorkload({ rps: 900_000, peakRps: 1_000_000 });
eq("autoscale max", run().instances["api"], 6);

// ---- queue backlog: a slow consumer is reported, more copies fix it
sample();
useStudio.getState().setWorkload({ rps: 200_000, peakRps: 200_000 });
const slow = run();
if (!(slow.backlog["worker"] > 0)) { bad++; console.log("FAIL backlog expected", slow.backlog); }
useStudio.getState().setReplicas("worker", 50);
if (!(run().backlog["worker"] < slow.backlog["worker"])) { bad++; console.log("FAIL more consumers should shrink the backlog"); }

// ---- copies and hit rate survive save and load
sample(); asApp();
useStudio.getState().setReplicas("db", 3); useStudio.getState().setHitRate("cache", 65); useStudio.getState().setAutoscale("api", { min: 2, max: 8 });
const s = useStudio.getState();
const doc = parseDoc(JSON.parse(JSON.stringify(toDoc(s.nodes, s.edges, s.workload)))) as DesignDoc;
const back = fromDoc(doc);
eq("replicas round trip", back.nodes.find((n) => n.id === "db")!.data.replicas, 3);
eq("hit round trip", back.nodes.find((n) => n.id === "cache")!.data.hitRate, 65);
eq("autoscale round trip", back.nodes.find((n) => n.id === "api")!.data.autoscale, { min: 2, max: 8 });
eq("old design has no replicas", back.nodes.find((n) => n.id === "lb")!.data.replicas, undefined);

// ---- invalid links are refused by the store, and old ones stay loadable
sample();
const n0 = useStudio.getState().edges.length;
useStudio.getState().onConnect({ source: "cache", target: "cdn", sourceHandle: null, targetHandle: null });
eq("invalid link refused", useStudio.getState().edges.length, n0);
eq("notice set", Boolean(useStudio.getState().linkNotice), true);
useStudio.getState().onConnect({ source: "api", target: "s3", sourceHandle: null, targetHandle: null });
eq("valid link added", useStudio.getState().edges.length, n0 + 1);
void DEFAULT_WORKLOAD;

// ---- best value: cheaper or equal on what has real prices, models untouched, undo restores
{
  const { optimizeForPrice } = await import("../src/components/studio/optimize");
  sample();
  const s0 = useStudio.getState();
  const r = optimizeForPrice(s0.nodes, s0.edges, s0.workload);
  console.log(`best value: ${r.switches.length} switches, $${r.before.toFixed(0)} -> $${r.after.toFixed(0)}`, r.switches.map((x) => `${x.name}: ${x.from} -> ${x.to}`).join("; "));
  eq("clients untouched", r.nodes.find((n) => n.id === "client")!.data.offeringId, s0.nodes.find((n) => n.id === "client")!.data.offeringId);
  useStudio.getState().applyOptimized(r.nodes, s0.nodes, "x");
  useStudio.getState().undoOptimized();
  eq("undo restores the design", useStudio.getState().nodes === s0.nodes, true);
  // a second run finds nothing more to do
  const again = optimizeForPrice(r.nodes, s0.edges, s0.workload);
  eq("idempotent", again.switches.length, 0);
}

// ---- free tiers: chosen when their stated limits cover the load, never otherwise
{
  const { pickPlanInfo } = await import("../src/lib/pricing/pick");
  const small = { rps: 1, dataGb: 0.2, readPct: 90, users: 500 };
  const big = { rps: 420, dataGb: 50, readPct: 90, users: 250000 };
  const pick = (o: string, t: string, u: typeof small, prod?: string) => pickPlanInfo(o, t, u, prod).plan;
  eq("neon free for a small app", pick("postgres:neon:serverless-postgres", "postgres", small, "Serverless Postgres")?.free, true);
  eq("neon free is not used at 50 GB", pick("postgres:neon:serverless-postgres", "postgres", big, "Serverless Postgres")?.free, undefined);
  eq("dynamodb free for a small app", pick("kv:aws:dynamodb", "kv", small)?.free, true);
  eq("dynamodb free not used at 50 GB", pick("kv:aws:dynamodb", "kv", big)?.free, undefined);
  eq("auth0 free under 25k users", pick("auth:auth0:customer-identity", "auth", small)?.free, true);
  eq("auth0 paid at 250k users", pick("auth:auth0:customer-identity", "auth", big)?.free, undefined);
  eq("workers free needs under ~1.1 rps", [pick("fn:cloudflare:workers", "fn", { ...small, rps: 1 })?.free, pick("fn:cloudflare:workers", "fn", { ...small, rps: 5 })?.free], [true, undefined]);
  // a tier with no stated limits is listed but never auto-picked
  eq("limitless free tier not auto-picked", pick("cloud:none", "fn", small), undefined);
  // best value on a tiny design uses free tiers and is cheaper than on a big one
  const { optimizeForPrice } = await import("../src/components/studio/optimize");
  sample();
  useStudio.getState().setWorkload({ users: 500, rps: 1, peakRps: 3, dataGb: 0.2 });
  const t0 = useStudio.getState();
  const tiny = optimizeForPrice(t0.nodes, t0.edges, t0.workload);
  console.log(`best value at tiny load: ${tiny.switches.length} switches, $${tiny.before.toFixed(2)} -> $${tiny.after.toFixed(2)}`, tiny.switches.map((x) => `${x.name} -> ${x.to}`).join("; "));
  if (!(tiny.after < tiny.before)) { bad++; console.log("FAIL tiny load should get cheaper"); }
}

// ---- a saved plan id that no longer exists falls back to Auto
{
  const { isAuto } = await import("../src/lib/model");
  eq("unknown plan id is Auto", isAuto({ typeId: "postgres", offeringId: "postgres:aws:rds-for-postgresql", planId: "gone-plan" }), true);
  eq("known plan id is kept", isAuto({ typeId: "postgres", offeringId: "postgres:aws:rds-for-postgresql", planId: "db-t4g-large" }), false);
}

// ---- the code-judge template: valid save format, every link allowed, nothing overloaded
{
  const { codeJudgeDoc } = await import("../src/lib/templates/codeJudge");
  const doc = parseDoc(JSON.parse(JSON.stringify(codeJudgeDoc()))) as DesignDoc;
  const d = fromDoc(doc);
  const invalid = d.edges.filter((e) => { const a = d.nodes.find((n) => n.id === e.source)!, b = d.nodes.find((n) => n.id === e.target)!; return !checkLink(a.data.typeId, b.data.typeId).ok; });
  eq("judge template has no invalid links", invalid.map((e) => e.id), []);
  const sim = analyze(d.nodes, d.edges, d.workload).sim;
  eq("judge template: nothing over capacity", sim.errorPct, 0);
  eq("judge template: ten requests a second in", Math.round(sim.entryRps), 10);
  console.log(`code judge: $${sim.cost.toFixed(0)}/mo (people-time $${sim.buckets.people.toFixed(0)}, infrastructure $${(sim.cost - sim.buckets.people).toFixed(0)}), ${sim.latencyMs.toFixed(0)} ms`);
}

// ---- team and operations inputs decide free tiers and per-seat prices
{
  const { pickPlanInfo } = await import("../src/lib/pricing/pick");
  const { estimate } = await import("../src/lib/pricing/estimate");
  const { OFFERING_BY_ID } = await import("../src/lib/catalog/offerings");
  const { DEFAULT_OPS } = await import("../src/lib/sim");
  const base = { rps: 1, dataGb: 1, readPct: 90, users: 100 };
  const at = (o: string, t: string, ops: Partial<typeof DEFAULT_OPS>) => pickPlanInfo(o, t, { ...base, ops: { ...DEFAULT_OPS, ...ops } }).plan;
  eq("github actions free at 1,500 CI minutes", at("ci:github:actions", "ci", { ciMinutes: 1500 })?.free, true);
  eq("github actions not free at 5,000 minutes", at("ci:github:actions", "ci", { ciMinutes: 5000 })?.free, undefined);
  eq("doppler free for 3 people", at("secrets:doppler:secrets", "secrets", { seats: 3 })?.free, true);
  eq("doppler not free for 8 people", at("secrets:doppler:secrets", "secrets", { seats: 8 })?.free, undefined);
  eq("datadog free up to 5 hosts, not 20", [at("metrics:datadog:infrastructure-apm", "metrics", { hosts: 5 })?.free, at("metrics:datadog:infrastructure-apm", "metrics", { hosts: 20 })?.free], [true, undefined]);
  eq("better stack free needs both monitors and logs to fit", [at("logs:better-stack:logs", "logs", { monitors: 5, ingestGb: 2 })?.free, at("logs:better-stack:logs", "logs", { monitors: 5, ingestGb: 30 })?.free], [true, undefined]);
  // per-seat price scales with the team
  const o = OFFERING_BY_ID["ci:github:actions"];
  const team = (seats: number) => { const p = at("ci:github:actions", "ci", { seats, ciMinutes: 9000 }); return p ? estimate(o, p, { rps: 1, dataGb: 1, read: 0.9, users: 100, ops: { ...DEFAULT_OPS, seats } })?.monthly : undefined; };
  const t5 = team(5), t50 = team(50);
  if (!(t5 != null && t50 != null && t50 > t5)) { bad++; console.log("FAIL per-seat price should grow with the team", t5, t50); }
  // old saved designs without the new fields load with defaults
  const old = fromDoc({ version: 2, workload: { users: 10, dataGb: 1, rps: 1, peakRps: 2, readPct: 90, atPeak: false } as never, nodes: [], edges: [] });
  eq("old design gets default seats", old.workload.seats, DEFAULT_OPS.seats);
  eq("old design still validates", Boolean(parseDoc({ version: 2, workload: { users: 10, dataGb: 1, rps: 1, peakRps: 2, readPct: 90, atPeak: false }, nodes: [], edges: [] })), true);
}

console.log(bad ? `${bad} problem(s)` : "all checks passed");
process.exit(bad ? 1 : 0);
