import type { DesignDoc } from "../doc";
import { CODE_JUDGE_TITLE, codeJudgeDoc } from "./codeJudge";
import { laid, links, node, off, traffic } from "./build";

export type Level = "easy" | "medium" | "complex";

/** A ready-made design to start from, with what it is meant to teach. */
export interface Template {
  id: string;
  title: string;
  level: Level;
  /** One line: what the system does. */
  blurb: string;
  /** What to look for on the canvas: the ideas this design is built to show. */
  learn: string[];
  doc: () => DesignDoc;
}

export const LEVELS: { id: Level; label: string; sub: string }[] = [
  { id: "easy", label: "Easy", sub: "3 to 5 parts" },
  { id: "medium", label: "Medium", sub: "A cache, a queue, a few services" },
  { id: "complex", label: "Complex", sub: "Many services, real scale" },
];

export const TEMPLATES: Template[] = [
  {
    id: "blog", title: "Personal blog", level: "easy",
    blurb: "Static pages behind a CDN, plus a contact form that sends email.",
    learn: ["A CDN answers nearly every read, so the origin barely works.", "No server to run: a function wakes up only when someone writes.", "Free tiers cover this whole system."],
    doc: () => laid(
      traffic({ users: 2000, dataGb: 1, rps: 3, peakRps: 15, readPct: 99 }),
      [
        node("readers", "client", "Readers"),
        node("cdn", "cdn", "CDN"),
        node("site", "static", "Blog (static pages)", { offering: off("static", "Cloudflare", "Pages") }),
        node("form", "fn", "Contact form", { offering: off("fn", "Cloudflare", "Workers") }),
        node("mail", "email", "Email"),
      ],
      links([["readers", ["cdn", "form"]], ["cdn", "site"], ["form", "mail"]]),
    ),
  },
  {
    id: "todo", title: "To-do app", level: "easy",
    blurb: "A web app on a managed platform with sign-in and one database.",
    learn: ["The smallest useful backend: app, database, login.", "Sign-in is bought, not built.", "Writes are 30% here; the database is the part that must never lose data."],
    doc: () => laid(
      traffic({ users: 500, dataGb: 1, rps: 4, peakRps: 12, readPct: 70 }),
      [
        node("browser", "client", "Browsers"),
        node("api", "paas", "To-do API", { offering: off("paas", "Render", "Platform") }),
        node("db", "postgres", "Tasks", { offering: off("postgres", "Neon", "Serverless Postgres") }),
        node("auth", "auth", "Sign-in", { offering: off("auth", "Clerk", "Auth") }),
      ],
      links([["browser", "api"], ["api", ["db", "auth"]]]),
    ),
  },
  {
    id: "shortener", title: "URL shortener", level: "easy",
    blurb: "Short links that redirect: almost all traffic is reads, so a cache does the work.",
    learn: ["99% reads: put a cache in front of the database.", "Two copies of the app behind a load balancer survive one failing.", "Raise the traffic and watch which box fills first."],
    doc: () => laid(
      traffic({ users: 20000, dataGb: 5, rps: 200, peakRps: 800, readPct: 99 }),
      [
        node("browser", "client", "Visitors"),
        node("lb", "lb", "Load balancer"),
        node("app", "app", "Redirect service", { replicas: 2 }),
        node("cache", "redis", "Link cache", { hit: 95 }),
        node("db", "postgres", "Links"),
      ],
      links([["browser", "lb"], ["lb", "app"], ["app", ["cache", "db"]]]),
    ),
  },
  {
    id: "chat", title: "Realtime chat", level: "medium",
    blurb: "People keep a WebSocket open; pub/sub carries each message to whichever server holds the other person's connection.",
    learn: ["With several servers, a message must reach the right one: that is what pub/sub is for.", "Presence and recent messages live in Redis; history lives in the database.", "Attachments go to object storage, not the database."],
    doc: () => laid(
      traffic({ users: 50000, dataGb: 200, rps: 300, peakRps: 1500, readPct: 60 }),
      [
        node("people", "client", "People chatting"),
        node("lb", "lb", "Load balancer"),
        node("ws", "app", "Chat servers (WebSocket)", { replicas: 3 }),
        node("auth", "auth", "Sign-in"),
        node("cache", "redis", "Presence + recent messages", { hit: 90 }),
        node("db", "postgres", "Message history"),
        node("files", "object", "Attachments"),
        node("bus", "pubsub", "Message pub/sub", { offering: off("pubsub", "Redis", "Pub/Sub") }),
      ],
      links([["people", "lb"], ["lb", "ws"], ["ws", ["auth", "cache", "db", "files", "bus"]], ["bus", "ws"]]),
    ),
  },
  {
    id: "shop", title: "Online store", level: "medium",
    blurb: "A catalogue people browse, a checkout that takes payment, and orders handled in the background.",
    learn: ["Product images come from a CDN so the API only serves data.", "Search is its own database, built for text queries.", "After payment, a queue lets the order finish (email, stock) without making the buyer wait."],
    doc: () => laid(
      traffic({ users: 100000, dataGb: 80, rps: 150, peakRps: 900, readPct: 92 }),
      [
        node("shoppers", "client", "Shoppers"),
        node("cdn", "cdn", "Image CDN"),
        node("images", "object", "Product images"),
        node("gw", "apigw", "API gateway"),
        node("api", "containers", "Store API", { autoscale: { min: 2, max: 8 } }),
        node("cache", "redis", "Catalogue cache", { hit: 85 }),
        node("db", "postgres", "Products, orders, users"),
        node("search", "search", "Product search"),
        node("pay", "payments", "Payments"),
        node("orders", "queue", "Order events"),
        node("worker", "worker", "Order worker"),
        node("mail", "email", "Order emails"),
      ],
      links([["shoppers", ["cdn", "gw"]], ["cdn", "images"], ["gw", "api"], ["api", ["cache", "db", "search", "pay", "orders"]], ["orders", "worker"], ["worker", ["db", "mail"]]]),
    ),
  },
  {
    id: "photos", title: "Photo sharing", level: "medium",
    blurb: "Upload a photo, get thumbnails made in the background, and serve every image from a CDN.",
    learn: ["Reads dominate, so the database gets read replicas (writes still go to one primary).", "Resizing is slow work: it goes through a queue to workers.", "Autoscaling follows the traffic instead of paying for peak all month."],
    doc: () => laid(
      traffic({ users: 300000, dataGb: 2000, rps: 600, peakRps: 3000, readPct: 95 }),
      [
        node("people", "client", "People"),
        node("cdn", "cdn", "Image CDN", { hit: 97 }),
        node("photos", "object", "Photos + thumbnails"),
        node("lb", "lb", "Load balancer"),
        node("api", "app", "Photo API", { autoscale: { min: 2, max: 10 } }),
        node("auth", "auth", "Sign-in"),
        node("cache", "redis", "Feed cache", { hit: 90 }),
        node("db", "postgres", "Users, photos, likes", { replicas: 3 }),
        node("jobs", "queue", "Resize jobs"),
        node("resizer", "worker", "Thumbnailer", { replicas: 3 }),
      ],
      links([["people", ["cdn", "lb"]], ["cdn", "photos"], ["lb", "api"], ["api", ["auth", "cache", "db", "photos", "jobs"]], ["jobs", "resizer"], ["resizer", ["photos", "db"]]]),
    ),
  },
  {
    id: "judge", title: CODE_JUDGE_TITLE, level: "complex",
    blurb: "People submit code; sandboxed workers run it and the verdict is pushed back over a WebSocket.",
    learn: ["Untrusted code runs in isolated containers so a hostile submission is contained.", "A queue absorbs bursts of submissions; add workers to drain it faster.", "Pub/sub routes a verdict to whichever server holds that user's socket."],
    doc: codeJudgeDoc,
  },
  {
    id: "feed", title: "Social feed", level: "complex",
    blurb: "Posts fan out into every follower's timeline when they are written, so reading a feed is one cache lookup.",
    learn: ["Fan-out on write: pay once when posting so millions of reads stay cheap.", "Each service owns its data; search is fed from the same stream as the timelines.", "Hit rates decide everything: change the timeline cache's and watch the database."],
    doc: () => laid(
      traffic({ users: 2_000_000, dataGb: 5000, rps: 2000, peakRps: 8000, readPct: 95 }),
      [
        node("people", "client", "People"),
        node("cdn", "cdn", "Media CDN", { hit: 97 }),
        node("media", "object", "Photos and video"),
        node("gw", "apigw", "API gateway"),
        node("auth", "auth", "Sign-in"),
        node("feed", "app", "Feed service", { replicas: 4 }),
        node("timeline", "redis", "Timeline cache", { hit: 98 }),
        node("graph", "postgres", "Users and follows", { replicas: 2 }),
        node("posts-api", "app", "Post service", { replicas: 3 }),
        node("posts", "postgres", "Posts", { replicas: 3 }),
        node("events", "stream", "Post events"),
        node("fanout", "worker", "Fan-out workers", { replicas: 4 }),
        node("indexer", "worker", "Search indexer", { replicas: 2 }),
        node("search-api", "app", "Search service", { replicas: 2 }),
        node("search", "search", "Post search"),
      ],
      links([
        ["people", ["cdn", "gw"]], ["cdn", "media"],
        ["gw", ["auth", "feed", "posts-api", "search-api"]],
        ["feed", ["timeline", "graph"]],
        ["posts-api", ["posts", "media", "events"]],
        ["events", ["fanout", "indexer"]],
        ["fanout", ["timeline", "graph"]],
        ["indexer", "search"], ["search-api", "search"],
      ], { "gw>auth": 5, "gw>feed": 70, "gw>posts-api": 20, "gw>search-api": 5 }),
    ),
  },
  {
    id: "video", title: "Video streaming", level: "complex",
    blurb: "Uploads are converted into streamable formats in the background; viewers pull the result from a CDN.",
    learn: ["Bandwidth is the bill: the CDN and storage egress dominate cost.", "Transcoding is heavy, bursty work: a queue feeds a pool of workers.", "View events stream into a warehouse so analytics never touches the live database."],
    doc: () => laid(
      traffic({ users: 1_000_000, dataGb: 20000, rps: 1500, peakRps: 6000, readPct: 98 }),
      [
        node("viewers", "client", "Viewers and creators"),
        node("cdn", "cdn", "Video CDN", { hit: 96 }),
        node("encoded", "object", "Encoded videos"),
        node("gw", "apigw", "API gateway"),
        node("auth", "auth", "Sign-in"),
        node("api", "app", "Video API", { autoscale: { min: 3, max: 20 } }),
        node("cache", "redis", "Metadata cache", { hit: 92 }),
        node("db", "postgres", "Video metadata", { replicas: 2 }),
        node("search", "search", "Video search"),
        node("raw", "object", "Raw uploads"),
        node("jobs", "queue", "Transcode jobs"),
        node("transcode", "worker", "Transcoders", { replicas: 6 }),
        node("views", "stream", "View events"),
        node("analytics", "worker", "Analytics worker"),
        node("wh", "warehouse", "Analytics warehouse"),
      ],
      links([
        ["viewers", ["cdn", "gw"]], ["cdn", "encoded"],
        ["gw", ["auth", "api"]],
        ["api", ["cache", "db", "search", "raw", "views"]],
        ["raw", "jobs"], ["jobs", "transcode"], ["transcode", ["encoded", "db"]],
        ["views", "analytics"], ["analytics", "wh"],
      ], { "gw>auth": 5, "gw>api": 95, "api>views": 5, "api>cache": 50, "api>db": 25, "api>search": 10, "api>raw": 5 }),
    ),
  },
  {
    id: "ride", title: "Ride hailing", level: "complex",
    blurb: "Drivers stream their location, a matcher pairs them with riders, and updates are pushed live.",
    learn: ["Location updates are a firehose: a stream and an in-memory store, not the main database.", "Matching runs off the request path, then pub/sub pushes the result to both phones.", "Payments and maps are outside services: you pay per call."],
    doc: () => laid(
      traffic({ users: 500_000, dataGb: 500, rps: 400, peakRps: 1600, readPct: 50 }),
      [
        node("riders", "client", "Riders"),
        node("drivers", "client", "Drivers"),
        node("gw", "apigw", "API gateway"),
        node("trip", "app", "Trip service", { replicas: 3 }),
        node("trips", "postgres", "Trips and users", { replicas: 4 }),
        node("maps", "maps", "Maps and routes"),
        node("pay", "payments", "Payments"),
        node("loc", "app", "Location service", { autoscale: { min: 2, max: 20 } }),
        node("geo", "redis", "Live driver locations", { hit: 90 }),
        node("locs", "stream", "Location updates"),
        node("match", "worker", "Matcher", { replicas: 6 }),
        node("bus", "pubsub", "Ride updates"),
        node("push", "app", "Realtime gateway (WebSocket)", { replicas: 3 }),
      ],
      links([
        [["riders", "drivers"], "gw"],
        ["gw", ["trip", "loc", "push"]],
        ["trip", ["trips", "maps", "pay"]],
        ["loc", ["geo", "locs"]],
        ["locs", "match"], ["match", ["geo", "trips", "bus"]],
        ["bus", "push"],
      ], { "gw>trip": 20, "gw>loc": 70, "gw>push": 10, "trip>trips": 70, "trip>maps": 20, "trip>pay": 10, "match>geo": 40, "match>trips": 10, "match>bus": 50 }),
    ),
  },
];

export const TEMPLATE_BY_ID: Record<string, Template> = Object.fromEntries(TEMPLATES.map((t) => [t.id, t]));
