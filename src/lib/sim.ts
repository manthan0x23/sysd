import type { Edge } from "@xyflow/react";
import { BUCKETS, TYPE_BY_ID, type Bucket } from "./catalog";
import { offeringOf, type StudioNode } from "./model";
import { SECONDS_PER_MONTH, type Estimate } from "./pricing/estimate";

export interface Workload {
  users: number;
  /** Data stored, in GB. Drives disk and memory needs of databases, caches and search. */
  dataGb: number;
  rps: number;
  peakRps: number;
  readPct: number; // 50-99
  atPeak: boolean;
}

export const DEFAULT_WORKLOAD: Workload = { users: 250_000, dataGb: 50, rps: 1200, peakRps: 4800, readPct: 90, atPeak: false };

export interface SimResult {
  load: Record<string, number>;
  util: Record<string, number | null>;
  edgeLoad: Record<string, number>;
  /** Requests per second entering the system (all clients together). */
  entryRps: number;
  latencyMs: number;
  headroom: number | null;
  cost: number;
  /** Monthly cost per component. */
  nodeCost: Record<string, number>;
  /** True where the cost comes from real prices; false where it is the built-in illustrative figure. */
  priced: Record<string, boolean>;
  /** True where the user entered the cost themselves. */
  yours: Record<string, boolean>;
  /** Monthly cost per bucket. */
  buckets: Record<Bucket, number>;
  topBucket: Bucket | null;
  /** Monthly cost per user, the headline unit cost. */
  unitCost: number;
  /** Share of requests dropped by the most overloaded component (0 when nothing is over capacity). */
  errorPct: number;
  hottestId: string | null;
}

/** Inputs from the pricing pass: real prices that replace the illustrative figures. */
export interface CostContext {
  /** Monthly price of a server block's plan, by node id. */
  serverPrice?: Record<string, number | undefined>;
  /** Estimates for managed services, by node id. */
  estimates?: Record<string, Estimate | null | undefined>;
}

export const CACHE_HIT = 0.8;
const ASYNC_SHARE = 0.1;
const MAX_UTIL_FOR_LATENCY = 0.95;
const PEOPLE_PER_SERVER = 100;
const PEOPLE_PER_SELF_HOSTED = 60;

type N = StudioNode;

export type SplitMode = "manual" | "cache-db" | "even" | "single";

/**
 * How a node's traffic divides over its outgoing links.
 * - manual: the user typed a share on at least one link; the rest split what is left.
 * - cache-db: a cache and a database side by side. Reads go to the cache; the database gets writes plus
 *   the reads the cache misses; anything else gets a small async share.
 * - even: equal shares.
 */
export function splitFor(targets: Edge[], roleOf: (id: string) => string, readPct: number): { weights: number[]; mode: SplitMode } {
  const manual = targets.map((e) => (e.data as { weight?: number } | undefined)?.weight);
  if (manual.some((m) => m != null)) {
    const fixed = manual.reduce<number>((a, m) => a + (m ?? 0), 0) / 100;
    const free = manual.filter((m) => m == null).length;
    const each = free ? Math.max(0, 1 - fixed) / free : 0;
    return { weights: manual.map((m) => (m != null ? m / 100 : each)), mode: "manual" };
  }
  if (targets.length === 1) return { weights: [1], mode: "single" };
  const roles = targets.map((e) => roleOf(e.target));
  if (roles.includes("cache") && roles.includes("db")) {
    const read = readPct / 100;
    return { weights: roles.map((r) => (r === "cache" ? read : r === "db" ? 1 - read * CACHE_HIT : ASYNC_SHARE)), mode: "cache-db" };
  }
  return { weights: targets.map(() => 1 / targets.length), mode: "even" };
}

/**
 * Illustrative traffic simulation. Requests flow from every client along the links; a node's output divides
 * over its links by splitFor(). Utilisation is load / capacity, where capacity is a per-type illustrative figure.
 */
export function simulate(nodes: N[], edges: Edge[], w: Workload, ctx: CostContext = {}): SimResult {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const out = new Map<string, Edge[]>();
  for (const e of edges) {
    if (!byId.has(e.source) || !byId.has(e.target)) continue;
    out.set(e.source, [...(out.get(e.source) ?? []), e]);
  }
  const roleOf = (id: string) => TYPE_BY_ID[byId.get(id)!.data.typeId].role;
  const entryRps = w.atPeak ? w.peakRps : w.rps;

  const load: Record<string, number> = {};
  const edgeLoad: Record<string, number> = {};

  const push = (id: string, amount: number, path: Set<string>) => {
    load[id] = (load[id] ?? 0) + amount;
    const targets = out.get(id) ?? [];
    if (!targets.length) return;
    const { weights } = splitFor(targets, roleOf, w.readPct);
    targets.forEach((e, i) => {
      const share = amount * weights[i];
      edgeLoad[e.id] = (edgeLoad[e.id] ?? 0) + share;
      if (!path.has(e.target)) push(e.target, share, new Set(path).add(e.target));
    });
  };

  const sources = nodes.filter((n) => TYPE_BY_ID[n.data.typeId].role === "source");
  for (const s of sources) push(s.id, entryRps, new Set([s.id]));

  const util: Record<string, number | null> = {};
  const nodeCost: Record<string, number> = {};
  const priced: Record<string, boolean> = {};
  const yours: Record<string, boolean> = {};
  let maxUtil = 0;
  let hottestId: string | null = null;
  let cost = 0;
  let errorPct = 0;
  const buckets = Object.fromEntries(BUCKETS.map((b) => [b, 0])) as Record<Bucket, number>;
  const bill = (id: string, bucket: Bucket | null, amount: number, real: boolean) => {
    nodeCost[id] = (nodeCost[id] ?? 0) + amount;
    priced[id] = priced[id] ?? real;
    cost += amount;
    if (bucket) buckets[bucket] += amount;
  };

  for (const n of nodes) {
    const kind = TYPE_BY_ID[n.data.typeId];
    const model = offeringOf(n.data)?.model;
    const own = n.data.customCost;
    if (own && kind.role !== "source") {
      // The user's own figure replaces every other price for this component, including operating time.
      const monthly = own.fixed + own.perMillion * (((load[n.id] ?? 0) * SECONDS_PER_MONTH) / 1e6);
      bill(n.id, own.bucket ?? kind.bucket ?? "managed", monthly, true);
      yours[n.id] = true;
      if (kind.role === "host" || kind.cap == null) { util[n.id] = null; continue; }
      const l0 = load[n.id] ?? 0, u0 = l0 / kind.cap;
      util[n.id] = u0;
      if (l0 > 0 && u0 > maxUtil) { maxUtil = u0; hottestId = n.id; }
      if (u0 > 1) errorPct = Math.max(errorPct, 1 - 1 / u0);
      continue;
    }
    if (kind.role === "host") {
      util[n.id] = null;
      if (kind.host === "server") {
        const price = ctx.serverPrice?.[n.id];
        bill(n.id, "compute", price ?? 0, price != null);
        bill(n.id, "people", PEOPLE_PER_SERVER, false);
      }
      continue;
    }
    if (kind.cap == null) { util[n.id] = null; continue; }
    const l = load[n.id] ?? 0;
    const u = l / kind.cap;
    util[n.id] = u;
    if (model === "self-hosted") {
      // Runs on a server you pay for elsewhere; the cost is the people time to operate it.
      bill(n.id, "people", PEOPLE_PER_SELF_HOSTED, false);
    } else {
      const est = ctx.estimates?.[n.id];
      if (est) bill(n.id, kind.bucket, est.monthly, true);
      else bill(n.id, kind.bucket, kind.base + kind.perRps * l, false);
    }
    if (l > 0 && u > maxUtil) { maxUtil = u; hottestId = n.id; }
    if (u > 1) errorPct = Math.max(errorPct, 1 - 1 / u);
  }

  const nodeMs = (id: string) => {
    const kind = TYPE_BY_ID[byId.get(id)!.data.typeId];
    const u = Math.min(util[id] ?? 0, MAX_UTIL_FOR_LATENCY);
    return kind.ms / (1 - u);
  };
  const longest = (id: string, path: Set<string>): number => {
    const next = (out.get(id) ?? []).filter((e) => !path.has(e.target));
    const tail = next.length ? Math.max(...next.map((e) => longest(e.target, new Set(path).add(e.target)))) : 0;
    return nodeMs(id) + tail;
  };
  const latencyMs = sources.length ? Math.max(...sources.map((s) => longest(s.id, new Set([s.id])))) : 0;

  const topBucket = cost > 0 ? BUCKETS.reduce((a, b) => (buckets[b] > buckets[a] ? b : a)) : null;
  const unitCost = w.users > 0 ? cost / w.users : 0;
  return { load, util, edgeLoad, entryRps: sources.length ? entryRps * sources.length : 0, latencyMs, headroom: maxUtil > 0 ? 1 / maxUtil : null, cost, nodeCost, priced, yours, buckets, topBucket, unitCost, errorPct, hottestId };
}

export interface Explanation { title: string; accent: string; body: string }

export function explain(nodes: N[], edges: Edge[], w: Workload, sim: SimResult): Explanation {
  void edges;
  if (!sim.hottestId) {
    return { title: "Nothing is carrying traffic yet", accent: "", body: "Connect a client to a component. Requests flow along the lines, and each component shows how full it gets." };
  }
  const hot = nodes.find((n) => n.id === sim.hottestId)!;
  const kind = TYPE_BY_ID[hot.data.typeId];
  const name = hot.data.name || kind.short || kind.label;
  const u = sim.util[hot.id] ?? 0;
  const pct = Math.round(u * 100);
  const pctLabel = pct > 200 ? "200%+" : `${pct}%`;
  const reqs = Math.round(sim.load[hot.id] ?? 0).toLocaleString("en-US");
  const total = Math.round(w.atPeak ? w.peakRps : w.rps).toLocaleString("en-US");

  if (u < 0.8) {
    return { title: "Healthy at this load. Busiest is", accent: `${name} at ${pctLabel}`, body: "Everything has room. Push the sliders up to see which component runs out first, then work out why." };
  }
  const hasCache = nodes.some((n) => TYPE_BY_ID[n.data.typeId].role === "cache");
  const bodies: Record<string, string> = {
    db: hasCache
      ? `The cache absorbs about ${Math.round(w.readPct * CACHE_HIT)}% of reads, but writes and misses still send ${reqs} of ${total} requests per second here. A higher hit rate or a read replica brings it down.`
      : `Every request that reaches it is a query: ${reqs} of ${total} requests per second. A cache in front would absorb most reads, so far fewer would reach the database.`,
    compute: `It takes ${kind.ms} ms of work per request, so ${reqs} requests per second need more concurrent capacity. Add instances behind a load balancer, or cache work you repeat.`,
    edge: `All traffic funnels through it: ${reqs} requests per second. Add a second one or spread traffic across regions.`,
    stream: `Messages arrive at ${reqs} per second faster than they drain. Add consumers, or partition the stream so more of them run in parallel.`,
    cache: `Hot keys concentrate ${reqs} requests per second on it. Shard the keyspace or add replicas.`,
    service: `It is an external service taking ${reqs} requests per second. Check its rate limits and per-request pricing, and cache or batch calls where you can.`,
    storage: `It serves ${reqs} requests per second directly. Put a CDN in front so repeat reads never reach it.`,
  };
  return { title: `Why ${name} is at`, accent: pctLabel, body: bodies[kind.role] ?? "" };
}
