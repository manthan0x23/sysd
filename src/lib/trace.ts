import type { Edge } from "@xyflow/react";
import { TYPE_BY_ID, kindOf, type LinkKind } from "./catalog";
import { hitRateOf, instancesFor, type StudioNode } from "./model";
import type { SimResult } from "./sim";

/**
 * Follows ONE request through the design, hop by hop, the way it would really travel: it enters at a client, passes
 * balancers and gateways, reaches a service, and that service decides what to ask next (cache first, then the
 * database; a write goes to the database and invalidates the cache; slow work is put on a queue and answered later).
 * Every step says what happens and why, so the same trace can drive a lesson as well as an animation.
 *
 * The decisions follow the kind of each node (see catalog/connections.ts), not specific products, so any design
 * built from the palette can be traced.
 */
export type TraceKind = "read-hit" | "read-miss" | "write";
export const TRACE_KINDS: { id: TraceKind; label: string; sub: string }[] = [
  { id: "read-hit", label: "Read, cache hit", sub: "The answer is already in memory" },
  { id: "read-miss", label: "Read, cache miss", sub: "Not cached: goes to the database" },
  { id: "write", label: "Write", sub: "Changes data; slow work goes to a queue" },
];

export interface TraceStep {
  /** The link walked, and which way. Absent for work done inside one node. */
  edgeId?: string;
  reverse?: boolean;
  from: string;
  to: string;
  /** request: on its way in. response: coming back. async: background work after the answer. push: result sent to the user later. */
  phase: "request" | "response" | "async" | "push";
  title: string;
  why: string;
  /** Time this step takes, and the running total on its own clock (async work starts when the answer is accepted). */
  ms: number;
  at: number;
}

export interface Trace {
  kind: TraceKind;
  steps: TraceStep[];
  /** How long the user waits for the first answer. */
  answerMs: number;
  /** When background work finishes (after the answer), or null if there is none. */
  backgroundMs: number | null;
  notes: string[];
}

const HOP_MS = 1;
const MAX_UTIL = 0.95;
const MAX_STEPS = 120;

const nameOf = (n: StudioNode) => n.data.name || TYPE_BY_ID[n.data.typeId]?.short || TYPE_BY_ID[n.data.typeId]?.label || n.id;

export function traceRequest(nodes: StudioNode[], edges: Edge[], sim: SimResult, kind: TraceKind): Trace {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const outs = new Map<string, Edge[]>();
  for (const e of edges) if (byId.has(e.source) && byId.has(e.target)) outs.set(e.source, [...(outs.get(e.source) ?? []), e]);
  const out = (id: string) => outs.get(id) ?? [];
  const nm = (id: string) => nameOf(byId.get(id)!);
  const ty = (id: string) => byId.get(id)!.data.typeId;
  const kd = (id: string): LinkKind => kindOf(ty(id));
  const targetsOfKind = (id: string, ...kinds: LinkKind[]) => out(id).filter((e) => kinds.includes(kd(e.target)));
  const nodeMs = (id: string) => TYPE_BY_ID[ty(id)].ms / (1 - Math.min(sim.util[id] ?? 0, MAX_UTIL));
  const read = kind !== "write";

  const steps: TraceStep[] = [];
  const notes: string[] = [];
  let clock = 0;
  let phase: TraceStep["phase"] = "request";
  const background: { queue: string; at: number }[] = [];
  const guard = () => steps.length < MAX_STEPS;

  const push = (s: Omit<TraceStep, "at" | "phase"> & { phase?: TraceStep["phase"] }) => {
    if (!guard()) return;
    clock += s.ms;
    steps.push({ ...s, phase: s.phase ?? phase, at: Math.round(clock * 10) / 10 });
  };
  /** Work done inside one node. */
  const work = (id: string, title: string, why: string, ms = nodeMs(id)) => push({ from: id, to: id, title, why, ms });
  /** Send over a link and come back: the callee's own steps happen in between. */
  const call = (edge: Edge, askTitle: string, askWhy: string, backTitle: string, backWhy: string, inner: () => void) => {
    push({ edgeId: edge.id, from: edge.source, to: edge.target, title: askTitle, why: askWhy, ms: HOP_MS });
    inner();
    push({ edgeId: edge.id, reverse: true, from: edge.target, to: edge.source, phase: phase === "request" ? "response" : phase, title: backTitle, why: backWhy, ms: HOP_MS });
  };

  const stack = new Set<string>();

  /** What `id` does with a request that has just arrived. */
  const handle = (id: string) => {
    if (!guard() || stack.has(id)) return;
    stack.add(id);
    const k = kd(id), type = TYPE_BY_ID[ty(id)];
    const copies = instancesFor(byId.get(id)!.data, Boolean(byId.get(id)!.parentId), sim.load[id] ?? 0);

    if (k === "edge") {
      const next = out(id).filter((e) => ["compute", "edge", "storage", "service", "cdn"].includes(kd(e.target)));
      if (!next.length) { work(id, `${nm(id)} has nowhere to send it`, "A link out of this node is missing, so the request stops here."); stack.delete(id); return; }
      const pick = next.find((e) => kd(e.target) === "compute") ?? next[0];
      const many = next.length > 1;
      work(id, many ? `${nm(id)} picks one of ${next.length} targets` : `${nm(id)} passes it on`,
        type.id === "lb"
          ? `A load balancer spreads requests over several servers so no single one takes all the traffic. This request goes to ${nm(pick.target)}.`
          : `${nm(id)} sits in front of the system: it can check, route or limit requests before they reach your code.`);
      call(pick, `${nm(id)} → ${nm(pick.target)}`, "Forwarded over the network.", `${nm(pick.target)} → ${nm(id)}`, "The reply comes back the same way, so the client never talks to the server directly.", () => handle(pick.target));
    } else if (k === "cdn") {
      const hit = hitRateOf(byId.get(id)!.data);
      const origin = out(id)[0];
      if (read && kind === "read-hit") {
        work(id, `${nm(id)} answers from its cache`, `${hit != null ? `A CDN keeps copies of popular content close to users and answers about ${hit}% of requests itself. ` : ""}This one never reaches your origin, which is why a CDN cuts both latency and load.`);
      } else if (origin) {
        work(id, `${nm(id)} cannot answer it`, read ? "Not in the CDN's cache, so it fetches the content from your origin (and keeps a copy for the next person)." : "Writes are never cached: a CDN passes them straight to your origin.");
        call(origin, `${nm(id)} → ${nm(origin.target)}`, "Origin fetch.", `${nm(origin.target)} → ${nm(id)}`, "The origin's answer returns to the CDN.", () => handle(origin.target));
      } else work(id, `${nm(id)} has no origin`, "Nothing is linked behind the CDN, so there is nothing to fetch on a miss.");
    } else if (k === "compute") {
      const cache = targetsOfKind(id, "cache")[0];
      const db = targetsOfKind(id, "db")[0];
      const queue = targetsOfKind(id, "queue").filter((e) => ty(e.target) !== "pubsub")[0];
      const storage = targetsOfKind(id, "storage")[0];
      const service = targetsOfKind(id, "service")[0];
      const next = targetsOfKind(id, "compute", "edge")[0];
      work(id, `${nm(id)} runs your code`, `${nm(id)} receives the request and decides what it needs: ${copies > 1 ? `(one of ${copies} copies sharing the load) ` : ""}${read ? "reads are answered from the cache when possible" : "a write has to reach the database"}.`);
      const used: string[] = [];
      const ask = (e: Edge, title: string, why: string, backTitle: string, backWhy: string) => { used.push(e.id); call(e, title, why, backTitle, backWhy, () => handle(e.target)); };

      if (read) {
        if (cache && kind === "read-hit") ask(cache, `${nm(id)} asks ${nm(cache.target)}`, "Check the cache first: memory is far faster than a database.", `${nm(cache.target)} → ${nm(id)}`, "Cache hit: the data is returned and the database is never asked.");
        else if (cache) {
          ask(cache, `${nm(id)} asks ${nm(cache.target)}`, "Check the cache first.", `${nm(cache.target)} → ${nm(id)}`, "Cache miss: it does not have the data.");
          if (db) ask(db, `${nm(id)} asks ${nm(db.target)}`, "On a miss the service reads the source of truth.", `${nm(db.target)} → ${nm(id)}`, "The row comes back.");
          else if (storage) ask(storage, `${nm(id)} reads ${nm(storage.target)}`, "On a miss the service reads the stored object.", `${nm(storage.target)} → ${nm(id)}`, "The object comes back.");
          call(cache, `${nm(id)} fills ${nm(cache.target)}`, "Store the result so the next request for it is a hit.", `${nm(cache.target)} → ${nm(id)}`, "Saved (cache-aside pattern).", () => work(cache.target, `${nm(cache.target)} stores it`, "Kept in memory with a time limit (TTL) so it does not go stale forever.", 1));
        } else if (db) ask(db, `${nm(id)} asks ${nm(db.target)}`, "There is no cache here, so every read goes to the database.", `${nm(db.target)} → ${nm(id)}`, "The rows come back.");
        else if (storage) ask(storage, `${nm(id)} reads ${nm(storage.target)}`, "Fetch the stored object.", `${nm(storage.target)} → ${nm(id)}`, "The object comes back.");
        else if (service) ask(service, `${nm(id)} calls ${nm(service.target)}`, "An outside service provides the data.", `${nm(service.target)} → ${nm(id)}`, "Its answer returns.");
      } else {
        if (db) ask(db, `${nm(id)} writes to ${nm(db.target)}`, "A write must reach the database: it is the source of truth, and the cache cannot answer it.", `${nm(db.target)} → ${nm(id)}`, "Saved. The database confirms.");
        if (cache) call(cache, `${nm(id)} invalidates ${nm(cache.target)}`, "The cached copy is now out of date, so it is deleted; the next read will fetch the fresh value.", `${nm(cache.target)} → ${nm(id)}`, "Cache entry removed.", () => work(cache.target, `${nm(cache.target)} drops the entry`, "Better a miss than a stale answer.", 1));
        if (storage) ask(storage, `${nm(id)} stores a file in ${nm(storage.target)}`, "Large or binary data lives in object storage, not the database.", `${nm(storage.target)} → ${nm(id)}`, "Stored.");
        if (queue) {
          call(queue, `${nm(id)} enqueues work on ${nm(queue.target)}`, "Slow work is put on a queue and the user is answered straight away. Producer and consumer are decoupled: a burst just makes the queue longer.", `${nm(queue.target)} → ${nm(id)}`, "Accepted: the user gets 'received', and the work happens in the background.", () => {
            work(queue.target, `${nm(queue.target)} keeps the message`, "The message waits here until a worker is free. If workers are slow or down, nothing is lost.", 2);
            background.push({ queue: queue.target, at: clock });
          });
          used.push(queue.id);
        }
        if (service && !db) ask(service, `${nm(id)} calls ${nm(service.target)}`, "Hand the write to an outside service.", `${nm(service.target)} → ${nm(id)}`, "Its answer returns.");
      }
      if (!used.length && !queue && next) call(next, `${nm(id)} → ${nm(next.target)}`, "One service calling another.", `${nm(next.target)} → ${nm(id)}`, "The reply comes back.", () => handle(next.target));
      else if (!used.length && !queue && !next) notes.push(`${nm(id)} has no database, cache or other service behind it, so the request ends there.`);
    } else if (k === "db") {
      work(id, read ? `${nm(id)} runs the query` : `${nm(id)} stores the change`, read
        ? `${copies > 1 ? `With ${copies} copies, reads are spread over the replicas. ` : ""}A database read is slower than a cache read because it may touch disk.`
        : `${copies > 1 ? "Writes go to the primary, which then copies them to the other replicas. " : ""}The write is made durable before it is confirmed.`);
    } else if (k === "cache") {
      work(id, kind === "read-hit" ? `${nm(id)} has it` : `${nm(id)} looks for it`, "Lookups take a fraction of a millisecond because the data is in RAM.", 1);
    } else if (k === "storage") {
      work(id, `${nm(id)} ${read ? "returns the object" : "stores the object"}`, "Object storage is cheap and durable but slower than a cache.");
    } else if (k === "service") {
      work(id, `${nm(id)} does its job`, "An outside service: you pay per use, and it adds a network round trip you do not control.");
    } else if (k === "queue") {
      work(id, `${nm(id)} receives the message`, "Messages are held in order until consumers take them.", 2);
    }
    stack.delete(id);
  };

  // ---- entry: a client, and the link it uses
  const client = nodes.find((n) => TYPE_BY_ID[n.data.typeId]?.role === "source" && out(n.id).length);
  if (!client) return { kind, steps: [], answerMs: 0, backgroundMs: null, notes: ["Add a client and link it to something to trace a request."] };
  const entry = out(client.id).filter((e) => ["edge", "cdn", "compute", "storage", "service"].includes(kd(e.target)));
  const viaCdn = entry.find((e) => kd(e.target) === "cdn");
  const first = (read && viaCdn) || entry.find((e) => kd(e.target) !== "cdn") || entry[0];
  if (!first) return { kind, steps: [], answerMs: 0, backgroundMs: null, notes: [`${nm(client.id)} is not linked to anything the request can enter through.`] };

  work(client.id, `${nm(client.id)} sends ${read ? "a read" : "a write"}`, read
    ? `A read asks for data without changing it (for example, opening a page). ${viaCdn && first === viaCdn ? "Static content goes through the CDN first." : ""}`
    : "A write changes data (for example, submitting a form). It cannot be answered from a cache.", 0);
  stack.add(client.id);
  call(first, `${nm(client.id)} → ${nm(first.target)}`, "The request crosses the network.", `${nm(first.target)} → ${nm(client.id)}`, "The answer returns to the user.", () => handle(first.target));
  stack.delete(client.id);
  const answerMs = Math.round(clock * 10) / 10;

  // ---- after the answer: queued work, and the result going back to the user
  let backgroundMs: number | null = null;
  for (const job of background) {
    phase = "async";
    clock = job.at;
    const consumers = targetsOfKind(job.queue, "compute");
    const worker = consumers[0];
    if (!worker) { notes.push(`${nm(job.queue)} has no consumer linked, so its messages would pile up forever.`); continue; }
    stack.add(job.queue);
    push({ edgeId: worker.id, from: worker.source, to: worker.target, title: `${nm(worker.source)} → ${nm(worker.target)}`, why: `${consumers.length > 1 ? `Several workers read from the queue (${consumers.length}); whichever is free takes the next message, so adding workers raises throughput. ` : ""}The worker pulls the job, instead of being pushed to, so it only takes what it can handle.`, ms: HOP_MS });
    work(worker.target, `${nm(worker.target)} does the job`, "The slow work happens here, away from the user's request. This is why the user was answered quickly.");
    stack.add(worker.target);
    const wdb = targetsOfKind(worker.target, "db")[0];
    const pub = targetsOfKind(worker.target, "queue").find((e) => ty(e.target) === "pubsub");
    if (wdb) call(wdb, `${nm(worker.target)} saves the result in ${nm(wdb.target)}`, "The outcome is stored so it can be read later.", `${nm(wdb.target)} → ${nm(worker.target)}`, "Saved.", () => handle(wdb.target));
    if (pub) {
      call(pub, `${nm(worker.target)} publishes to ${nm(pub.target)}`, "Publish/subscribe: the worker announces the result without knowing who is listening.", `${nm(pub.target)} → ${nm(worker.target)}`, "Published.", () => {
        const subs = targetsOfKind(pub.target, "compute");
        work(pub.target, `${nm(pub.target)} fans it out`, `Every subscriber (${subs.length || "none"}) gets a copy, since the broker cannot know which server holds this user's connection.`, 1);
        const sub = subs[0];
        if (!sub) return;
        push({ edgeId: sub.id, from: sub.source, to: sub.target, title: `${nm(pub.target)} → ${nm(sub.target)}`, why: "Delivered to a subscribed server.", ms: HOP_MS });
        work(sub.target, `${nm(sub.target)} pushes it to the user`, "The server holding this user's open connection (such as a WebSocket) forwards the result to their browser, with no polling.", 1);
        // back to the client along the links that led here
        const path = shortestPath(client.id, sub.target, edges);
        phase = "push";
        for (const e of [...path].reverse()) push({ edgeId: e.id, reverse: true, from: e.target, to: e.source, title: `${nm(e.target)} → ${nm(e.source)}`, why: "The pushed result travels back to the browser.", ms: HOP_MS });
      });
    }
    backgroundMs = Math.max(backgroundMs ?? 0, Math.round(clock * 10) / 10);
    stack.delete(worker.target); stack.delete(job.queue);
  }
  if (steps.length >= MAX_STEPS) notes.push("The trace was cut short: the design is large or contains a loop.");
  return { kind, steps, answerMs, backgroundMs, notes };
}

/** Links from `from` to `to`, shortest first (breadth first). Empty when unreachable. */
function shortestPath(from: string, to: string, edges: Edge[]): Edge[] {
  const prev = new Map<string, Edge>();
  const seen = new Set([from]);
  const queue = [from];
  for (let i = 0; i < queue.length; i++) {
    for (const e of edges) if (e.source === queue[i] && !seen.has(e.target)) { seen.add(e.target); prev.set(e.target, e); queue.push(e.target); }
  }
  const path: Edge[] = [];
  for (let at = to; at !== from; ) { const e = prev.get(at); if (!e) return []; path.push(e); at = e.source; }
  return path.reverse();
}
