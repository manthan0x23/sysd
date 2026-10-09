import { TYPE_BY_ID } from "./services";

/**
 * Which service can send traffic to which. The 76 service types fall into ten kinds, and a link is valid when its
 * (source kind, target kind) pair is in the table. Anything not listed is refused with a reason, because a cache
 * wired to a CDN or a database calling a load balancer is not a design, it is a mistake the canvas should catch.
 */
export type LinkKind = "client" | "edge" | "cdn" | "compute" | "db" | "cache" | "storage" | "queue" | "service" | "host";

export function kindOf(typeId: string): LinkKind {
  const t = TYPE_BY_ID[typeId];
  if (!t) return "service";
  if (t.id === "cdn") return "cdn";
  switch (t.role) {
    case "source": return "client";
    case "host": return "host";
    case "edge": return "edge";
    case "compute": return "compute";
    case "db": return "db";
    case "cache": return "cache";
    case "storage": return "storage";
    case "stream": return "queue";
    default: return "service";
  }
}

const ALLOWED: Record<LinkKind, LinkKind[]> = {
  client: ["edge", "cdn", "compute", "service", "storage", "queue"],
  edge: ["edge", "cdn", "compute", "storage", "service"],
  cdn: ["edge", "compute", "storage", "service"],
  compute: ["compute", "edge", "db", "cache", "storage", "queue", "service"],
  db: ["db", "queue", "storage", "service"],
  cache: ["db", "cache"],
  storage: ["compute", "queue", "storage", "service"],
  queue: ["compute", "queue", "storage", "service", "db"],
  service: ["compute", "queue", "service", "storage"],
  host: [],
};

const NAME: Record<LinkKind, string> = {
  client: "A client", edge: "A load balancer or gateway", cdn: "A CDN", compute: "A compute service", db: "A database", cache: "A cache",
  storage: "Storage", queue: "A queue or stream", service: "An external service", host: "A server block",
};
const TARGET: Record<LinkKind, string> = {
  client: "a client", edge: "a load balancer or gateway", cdn: "a CDN", compute: "a compute service", db: "a database", cache: "a cache",
  storage: "storage", queue: "a queue or stream", service: "an external service", host: "a server block",
};

const HINT: Partial<Record<`${LinkKind}>${LinkKind}`, string>> = {
  "client>db": "Put an API or app server between them.",
  "client>cache": "Put an API or app server between them.",
  "cache>compute": "A cache answers requests; it does not call other services.",
  "cache>edge": "A cache answers requests; it does not call other services.",
  "compute>cdn": "Traffic reaches a CDN from clients, not from your servers.",
  "db>compute": "A database does not call your app. Use a queue or change-data-capture instead.",
  "db>cache": "Fill a cache from the service that reads the database.",
  "storage>db": "Storage does not query a database. Use a service in between.",
};

export interface LinkRole { id: string; label: string }
export type LinkCheck = { ok: true; role: LinkRole } | { ok: false; reason: string };

/** What a valid link means, used for the label on the canvas and for the simulator's behaviour. */
function roleOf(a: LinkKind, b: LinkKind): LinkRole {
  if (a === "cdn") return { id: "origin", label: "origin fetch" };
  if (b === "cache") return { id: "cache", label: "cache lookup" };
  if (a === "cache") return { id: "cache-miss", label: "cache miss" };
  if (a === "db" && b === "db") return { id: "replication", label: "replication" };
  if (b === "db") return { id: "query", label: "query" };
  if (b === "queue") return { id: "enqueue", label: "enqueue" };
  if (a === "queue") return { id: "consume", label: "consume" };
  if (b === "storage") return { id: "blob", label: "blob I/O" };
  if (a === "storage" && b === "compute") return { id: "trigger", label: "event trigger" };
  if (b === "service") return { id: "call", label: "API call" };
  return { id: "request", label: "request" };
}

export function checkLink(sourceTypeId: string, targetTypeId: string): LinkCheck {
  const a = kindOf(sourceTypeId), b = kindOf(targetTypeId);
  if (b === "host") return { ok: false, reason: "Link to the service inside the server block, not the block itself." };
  if (b === "client") return { ok: false, reason: "Nothing sends traffic to a client; requests start there." };
  if (!ALLOWED[a].includes(b)) return { ok: false, reason: `${NAME[a]} can't send traffic to ${TARGET[b]}. ${HINT[`${a}>${b}`] ?? ""}`.trim() };
  return { ok: true, role: roleOf(a, b) };
}
