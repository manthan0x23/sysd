import { off, laid, links, node, traffic } from "./build";

/**
 * "Online code judge": people write code in the browser and submit it; sandboxed workers run it and the verdict is
 * pushed back over a WebSocket. Two app servers each hold WebSockets behind a load balancer; results travel from a
 * worker through pub/sub to whichever server holds that user's socket. Workers run in their own Docker containers
 * on a runner server, so a hostile submission is contained. Sized for a first launch: about 10 users, 10 requests/s,
 * half reads and half writes.
 */
export function codeJudgeDoc() {
  return laid(
    traffic({ users: 10, dataGb: 2, rps: 10, peakRps: 30, readPct: 50 }),
    [
      node("client", "client", "Browsers"),
      node("lb", "lb", "Load balancer", { offering: off("lb", "DigitalOcean", "Load Balancers") }),
      node("app-srv-1", "vps", "App server 1", { offering: off("vps", "DigitalOcean", "Droplets") }),
      node("app-1", "app", "API + WebSocket", { offering: off("app", "Self-hosted", "Node.js"), parent: "app-srv-1" }),
      node("app-srv-2", "vps", "App server 2", { offering: off("vps", "DigitalOcean", "Droplets") }),
      node("app-2", "app", "API + WebSocket", { offering: off("app", "Self-hosted", "Node.js"), parent: "app-srv-2" }),
      node("cache", "redis", "Redis cache", { offering: off("redis", "DigitalOcean", "Managed Valkey") }),
      node("db", "postgres", "Problems, users, verdicts", { offering: off("postgres", "DigitalOcean", "Managed PostgreSQL") }),
      node("queue", "queue", "Submission queue", { offering: off("queue", "CloudAMQP", "RabbitMQ") }),
      node("pubsub", "pubsub", "Verdict pub/sub", { offering: off("pubsub", "NATS", "Synadia Cloud") }),
      node("runner", "vps", "Runner server", { offering: off("vps", "DigitalOcean", "Droplets") }),
      node("sandbox-1", "container", "Sandbox 1", { offering: off("container", "Docker", "Container on your server"), parent: "runner" }),
      node("worker-1", "worker", "Judge worker", { offering: off("worker", "Self-hosted", "Go"), parent: "sandbox-1" }),
      node("sandbox-2", "container", "Sandbox 2", { offering: off("container", "Docker", "Container on your server"), parent: "runner" }),
      node("worker-2", "worker", "Judge worker", { offering: off("worker", "Self-hosted", "Go"), parent: "sandbox-2" }),
    ],
    links([
      ["client", "lb"],
      ["lb", ["app-1", "app-2"]],
      // each app server: cached reads, writes and misses to the database, submissions to the queue
      [["app-1", "app-2"], ["cache", "db", "queue"]],
      // workers pull submissions, store the verdict, and publish it so the right WebSocket can push it
      ["queue", ["worker-1", "worker-2"]],
      [["worker-1", "worker-2"], ["db", "pubsub"]],
      // app servers subscribe to verdicts for the sockets they hold
      ["pubsub", ["app-1", "app-2"]],
    ]),
  );
}

export const CODE_JUDGE_TITLE = "Online code judge";
