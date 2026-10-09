import type { Edge } from "@xyflow/react";
import { fromDoc, toDoc, type DesignDoc } from "../doc";
import { formatNodes } from "../layout";
import type { Workload } from "../sim";

/**
 * "Online code judge": people write code in the browser and submit it; sandboxed workers run it and the verdict is
 * pushed back over a WebSocket. Two app servers each hold WebSockets behind a load balancer; results travel from a
 * worker through pub/sub to whichever server holds that user's socket. Workers run in their own Docker containers
 * on a runner server, so a hostile submission is contained. Sized for a first launch: about 10 users, 10 requests/s,
 * half reads and half writes.
 */
const WORKLOAD: Workload = { users: 10, dataGb: 2, rps: 10, peakRps: 30, readPct: 50, atPeak: false };

type N = DesignDoc["nodes"][number];
const node = (id: string, type: string, name: string, extra: Partial<N> = {}): N => ({ id, type, name, x: 0, y: 0, ...extra });

const NODES: N[] = [
  node("client", "client", "Browsers"),
  node("lb", "lb", "Load balancer", { offering: "lb:digitalocean:load-balancers" }),

  node("app-srv-1", "vps", "App server 1", { offering: "vps:digitalocean:droplets" }),
  node("app-1", "app", "API + WebSocket", { offering: "app:self-hosted:node-js", parent: "app-srv-1" }),
  node("app-srv-2", "vps", "App server 2", { offering: "vps:digitalocean:droplets" }),
  node("app-2", "app", "API + WebSocket", { offering: "app:self-hosted:node-js", parent: "app-srv-2" }),

  node("cache", "redis", "Redis cache", { offering: "redis:digitalocean:managed-valkey" }),
  node("db", "postgres", "Problems, users, verdicts", { offering: "postgres:digitalocean:managed-postgresql" }),
  node("queue", "queue", "Submission queue", { offering: "queue:cloudamqp:rabbitmq" }),
  node("pubsub", "pubsub", "Verdict pub/sub", { offering: "pubsub:nats:synadia-cloud" }),

  node("runner", "vps", "Runner server", { offering: "vps:digitalocean:droplets" }),
  node("sandbox-1", "container", "Sandbox 1", { offering: "container:docker:container-on-your-server", parent: "runner" }),
  node("worker-1", "worker", "Judge worker", { offering: "worker:self-hosted:go", parent: "sandbox-1" }),
  node("sandbox-2", "container", "Sandbox 2", { offering: "container:docker:container-on-your-server", parent: "runner" }),
  node("worker-2", "worker", "Judge worker", { offering: "worker:self-hosted:go", parent: "sandbox-2" }),
];

const link = (from: string, to: string): DesignDoc["edges"][number] => ({ id: `e-${from}-${to}`, from, to });
const EDGES = [
  link("client", "lb"),
  link("lb", "app-1"), link("lb", "app-2"),
  // each app server: cached reads, writes and misses to the database, submissions to the queue
  ...["app-1", "app-2"].flatMap((a) => [link(a, "cache"), link(a, "db"), link(a, "queue")]),
  // workers pull submissions, store the verdict, and publish it so the right WebSocket can push it
  ...["worker-1", "worker-2"].flatMap((w) => [link("queue", w), link(w, "db"), link(w, "pubsub")]),
  // app servers subscribe to verdicts for the sockets they hold
  link("pubsub", "app-1"), link("pubsub", "app-2"),
];

/** The design, laid out left to right on the canvas grid. */
export function codeJudgeDoc(): DesignDoc {
  const base = fromDoc({ version: 2, workload: WORKLOAD, nodes: NODES, edges: EDGES });
  return toDoc(formatNodes(base.nodes, base.edges as Edge[]), base.edges, base.workload);
}

export const CODE_JUDGE_TITLE = "Online code judge";
