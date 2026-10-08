import {
  Activity, Archive, Bell, BarChart3, Camera, CreditCard, Cpu as CpuIcon, FlaskConical, MapPin, Newspaper, PhoneCall, RefreshCw, ShieldPlus, Video, Wifi, Flag, LineChart, Binary, Bot, Boxes, Brain, Bug, Cable, CircuitBoard, Cloud,
  Container, Cpu, Database, DatabaseZap, FileSearch, FileText, Fingerprint, Flame, FolderOpen,
  GitBranch, Globe, HardDrive, Image as ImageIcon, KeyRound, Layers, LayoutTemplate, ListOrdered, Mail,
  MemoryStick, MessageSquare, Mic, MonitorSmartphone, Network, Package, Radio, RadioTower, Rocket,
  Search, Server, ShieldCheck, Snowflake, Split, Table2, Timer, Waypoints, Waves, Workflow, Zap,
  type LucideIcon,
} from "lucide-react";
import { PROFILES } from "./sizing";
import type { Bucket, Category, Role, ServiceType } from "./types";

type Sim = Pick<ServiceType, "cap" | "ms" | "base" | "perRps">;
/** Illustrative simulation defaults per role. Real figures arrive with Phase 2 pricing. */
const ROLE_SIM: Record<Role, Sim> = {
  source: { cap: null, ms: 0, base: 0, perRps: 0 },
  host: { cap: null, ms: 0, base: 0, perRps: 0 },
  compute: { cap: 1000, ms: 40, base: 40, perRps: 0.2 },
  db: { cap: 400, ms: 12, base: 100, perRps: 0.5 },
  cache: { cap: 1500, ms: 2, base: 40, perRps: 0.05 },
  storage: { cap: 5000, ms: 30, base: 5, perRps: 0.02 },
  edge: { cap: 3000, ms: 10, base: 10, perRps: 0.03 },
  stream: { cap: 500, ms: 10, base: 20, perRps: 0.3 },
  service: { cap: 2000, ms: 60, base: 20, perRps: 0.1 },
};

const BUCKET_BY_CATEGORY: Record<Category, Bucket | null> = {
  Clients: null, Compute: "compute", Hosts: "compute", Databases: "managed", Caches: "managed",
  Storage: "storage", Network: "managed", Messaging: "managed", "Data & analytics": "managed",
  "Search & vector": "managed", AI: "managed", Observability: "managed", "Security & identity": "managed",
  "Dev & delivery": "managed", "Product & business": "managed", "Media & realtime": "managed",
};

/** Types whose self-hosted software has a differently named sizing profile. */
const PROFILE_KEY: Record<string, string> = { stream: "kafka", queue: "rabbitmq", search: "elasticsearch", warehouse: "clickhouse", object: "minio", vector: "qdrant" };

function t(id: string, label: string, category: Category, role: Role, icon: LucideIcon, o: Partial<ServiceType> = {}): ServiceType {
  return { id, label, category, role, icon, ...ROLE_SIM[role], bucket: BUCKET_BY_CATEGORY[category], hostable: PROFILES[PROFILE_KEY[id] ?? id], ...o };
}

const SHORT: Record<string, string> = {
  fn: "Function", containers: "Containers", worker: "Worker", k8s: "Kubernetes", paas: "PaaS", static: "Hosting", baas: "BaaS",
  mongodb: "MongoDB", mysql: "MySQL", kv: "Key-value", newsql: "NewSQL", sqlite: "SQLite", graph: "Graph DB", timeseries: "Time-series",
  object: "Storage", archive: "Archive", block: "Block", file: "Files", waf: "WAF", egress: "Egress", pubsub: "Pub/Sub", stream: "Kafka",
  workflow: "Workflows", email: "Email", warehouse: "Warehouse", spark: "Spark", streamproc: "Flink", etl: "ETL", lakehouse: "Lakehouse",
  bi: "BI", search: "Search", vector: "Vector DB", embeddings: "Embeddings", speech: "Speech", vision: "Vision AI", inference: "Model host",
  metrics: "Metrics / APM", payments: "Payments", maps: "Maps", analytics: "Analytics", flags: "Flags", cms: "CMS", media: "Video", images: "Images", rtc: "Calls", iot: "IoT", cdc: "CDC", mltrain: "ML training", uptime: "Uptime", backup: "Backup", errors: "Errors", tracing: "Tracing", auth: "Auth", secrets: "Secrets", registry: "Registry", cron: "Cron", chat: "Chat API",
};

const RAW_TYPES: ServiceType[] = [
  // Clients
  t("client", "Client", "Clients", "source", MonitorSmartphone),
  // Hosts: group blocks that hold other services
  t("vps", "Server / VPS", "Hosts", "host", Server, { host: "server" }),
  t("container", "Docker container", "Hosts", "host", Container, { host: "container" }),
  // Compute
  t("fn", "Serverless function", "Compute", "compute", Zap, { cap: 1000, ms: 40, base: 0, perRps: 0.9 }),
  t("app", "App server", "Compute", "compute", Cpu, { cap: 1500, ms: 25, base: 70, perRps: 0.1 }),
  t("containers", "Container service", "Compute", "compute", Boxes, { cap: 1200, ms: 30, base: 45, perRps: 0.15 }),
  t("worker", "Background worker", "Compute", "compute", CircuitBoard, { cap: 120, ms: 80, base: 40, perRps: 0.3 }),
  t("k8s", "Kubernetes cluster", "Compute", "compute", Network, { cap: 6000, ms: 20, base: 75, perRps: 0.05 }),
  t("paas", "App platform (PaaS)", "Compute", "compute", Rocket),
  t("static", "Frontend hosting", "Compute", "edge", LayoutTemplate),
  t("baas", "Backend platform (BaaS)", "Compute", "service", Layers),
  t("gpu", "GPU compute", "Compute", "compute", Flame, { cap: 200, ms: 400, base: 500, perRps: 2 }),
  // Databases
  t("postgres", "Postgres", "Databases", "db", Database, { cap: 205, ms: 12, base: 180, perRps: 0.6 }),
  t("mysql", "MySQL / MariaDB", "Databases", "db", Database),
  t("mongodb", "MongoDB / documents", "Databases", "db", Database),
  t("sqlserver", "SQL Server", "Databases", "db", Database),
  t("kv", "Key-value / wide-column", "Databases", "db", DatabaseZap, { cap: 900, ms: 6, base: 10, perRps: 0.7 }),
  t("newsql", "Distributed SQL", "Databases", "db", Database),
  t("sqlite", "Edge SQLite", "Databases", "db", Database),
  t("graph", "Graph database", "Databases", "db", Network),
  t("timeseries", "Time-series database", "Databases", "db", Activity),
  // Caches
  t("redis", "Redis", "Caches", "cache", MemoryStick, { cap: 1250, ms: 2, base: 50, perRps: 0.05 }),
  t("memcached", "Memcached", "Caches", "cache", MemoryStick),
  // Storage
  t("object", "Object storage", "Storage", "storage", Archive, { cap: 5000, ms: 30, base: 5, perRps: 0.02 }),
  t("block", "Block storage", "Storage", "storage", HardDrive),
  t("file", "File storage", "Storage", "storage", FolderOpen),
  t("archive", "Archive storage", "Storage", "storage", Archive, { cap: 100, ms: 500 }),
  // Network
  t("lb", "Load balancer", "Network", "edge", Split, { cap: 2000, ms: 3, base: 22, perRps: 0.02 }),
  t("cdn", "CDN", "Network", "edge", Globe, { cap: 2700, ms: 15, base: 0, perRps: 0.03, bucket: "transfer" }),
  t("apigw", "API gateway", "Network", "edge", Waypoints, { cap: 1800, ms: 8, base: 0, perRps: 0.08 }),
  t("proxy", "Reverse proxy", "Network", "edge", Cable),
  t("dns", "DNS", "Network", "edge", Globe, { cap: 50000, ms: 5, base: 1, perRps: 0.001 }),
  t("waf", "WAF / DDoS protection", "Network", "edge", ShieldCheck, { cap: 8000, ms: 2, base: 20, perRps: 0.01 }),
  t("egress", "Internet egress", "Network", "edge", Cloud, { cap: null, ms: 0, base: 0, perRps: 0.04, bucket: "transfer" }),
  // Messaging
  t("queue", "Queue", "Messaging", "stream", ListOrdered, { cap: 220, ms: 10, base: 0, perRps: 0.4 }),
  t("pubsub", "Pub/Sub & realtime", "Messaging", "stream", RadioTower, { cap: 2000, ms: 10, base: 0, perRps: 0.2 }),
  t("stream", "Event streaming (Kafka)", "Messaging", "stream", Activity, { cap: 3000, ms: 8, base: 250, perRps: 0.05 }),
  t("workflow", "Workflow orchestration", "Messaging", "service", Workflow),
  t("email", "Email delivery", "Messaging", "service", Mail),
  t("sms", "SMS & push", "Messaging", "service", Bell),
  // Data & analytics
  t("warehouse", "Data warehouse", "Data & analytics", "db", Table2, { cap: 60, ms: 800, base: 300, perRps: 4 }),
  t("spark", "Batch / Spark processing", "Data & analytics", "compute", Flame, { cap: 40, ms: 5000, base: 200, perRps: 5 }),
  t("streamproc", "Stream processing (Flink)", "Data & analytics", "compute", Waves, { cap: 5000, ms: 50, base: 150, perRps: 0.1 }),
  t("etl", "ETL / data pipelines", "Data & analytics", "service", GitBranch),
  t("lakehouse", "Lakehouse platform", "Data & analytics", "db", Snowflake, { cap: 80, ms: 700, base: 400, perRps: 4 }),
  t("bi", "BI & dashboards", "Data & analytics", "service", BarChart3),
  // Search & vector
  t("search", "Search engine", "Search & vector", "db", Search, { cap: 600, ms: 30, base: 90, perRps: 0.3 }),
  t("vector", "Vector database", "Search & vector", "db", Binary, { cap: 500, ms: 25, base: 70, perRps: 0.3 }),
  // AI
  t("llm", "LLM API", "AI", "service", Brain, { cap: 300, ms: 1500, base: 0, perRps: 6 }),
  t("embeddings", "Embeddings API", "AI", "service", Binary, { cap: 800, ms: 120, base: 0, perRps: 0.5 }),
  t("speech", "Speech (STT / TTS)", "AI", "service", Mic, { cap: 100, ms: 900, base: 0, perRps: 3 }),
  t("vision", "Vision & document AI", "AI", "service", ImageIcon, { cap: 150, ms: 700, base: 0, perRps: 2 }),
  t("inference", "Model hosting", "AI", "service", Bot, { cap: 150, ms: 600, base: 150, perRps: 2 }),
  // Observability
  t("logs", "Logging", "Observability", "service", FileText, { cap: 4000, ms: 5, base: 0, perRps: 0.15 }),
  t("metrics", "Metrics & APM", "Observability", "service", Activity, { cap: 5000, ms: 5, base: 30, perRps: 0.08 }),
  t("errors", "Error tracking", "Observability", "service", Bug, { cap: 3000, ms: 5, base: 26, perRps: 0.02 }),
  t("tracing", "Distributed tracing", "Observability", "service", FileSearch, { cap: 3000, ms: 5, base: 20, perRps: 0.1 }),
  // Security & identity
  t("auth", "Authentication", "Security & identity", "service", Fingerprint, { cap: 400, ms: 120, base: 25, perRps: 0.3 }),
  t("secrets", "Secrets & KMS", "Security & identity", "service", KeyRound, { cap: 1000, ms: 10, base: 1, perRps: 0.05 }),
  // Dev & delivery
  t("ci", "CI/CD", "Dev & delivery", "service", Timer, { cap: 60, ms: 200, base: 0, perRps: 0.5 }),
  t("registry", "Container registry", "Dev & delivery", "service", Package, { cap: 400, ms: 80, base: 5, perRps: 0.05 }),
  t("cron", "Scheduled jobs", "Dev & delivery", "compute", Radio, { cap: 50, ms: 100, base: 0, perRps: 0.2 }),
  t("chat", "Chat & collaboration API", "Dev & delivery", "service", MessageSquare),
  // Product & business
  t("payments", "Payments", "Product & business", "service", CreditCard, { cap: 300, ms: 400, base: 0, perRps: 1.5 }),
  t("maps", "Maps & geolocation", "Product & business", "service", MapPin, { cap: 1000, ms: 120, base: 0, perRps: 0.7 }),
  t("analytics", "Product analytics", "Product & business", "service", LineChart, { cap: 5000, ms: 20, base: 0, perRps: 0.1 }),
  t("flags", "Feature flags & experiments", "Product & business", "service", Flag, { cap: 8000, ms: 10, base: 0, perRps: 0.02 }),
  t("cms", "Headless CMS", "Product & business", "service", Newspaper, { cap: 1500, ms: 80, base: 0, perRps: 0.1 }),
  // Media & realtime
  t("media", "Video & streaming", "Media & realtime", "service", Video, { cap: 200, ms: 800, base: 0, perRps: 3 }),
  t("images", "Image processing", "Media & realtime", "service", Camera, { cap: 1500, ms: 60, base: 0, perRps: 0.2 }),
  t("rtc", "Voice & video calls", "Media & realtime", "service", PhoneCall, { cap: 100, ms: 50, base: 0, perRps: 4 }),
  t("iot", "IoT messaging", "Media & realtime", "stream", Wifi, { cap: 4000, ms: 15, base: 0, perRps: 0.1 }),
  // More data, AI, observability and storage
  t("cdc", "Change data capture", "Data & analytics", "service", RefreshCw, { cap: 1500, ms: 100, base: 30, perRps: 0.15 }),
  t("mltrain", "ML training platform", "AI", "service", FlaskConical, { cap: 20, ms: 3000, base: 200, perRps: 8 }),
  t("uptime", "Uptime & synthetic checks", "Observability", "service", CpuIcon, { cap: 500, ms: 50, base: 15, perRps: 0.05 }),
  t("backup", "Backup & disaster recovery", "Storage", "storage", ShieldPlus, { cap: 200, ms: 200, base: 10, perRps: 0.05 }),
];

export const SERVICE_TYPES: ServiceType[] = RAW_TYPES.map((x) => ({ ...x, short: SHORT[x.id] }));

export const TYPE_BY_ID: Record<string, ServiceType> = Object.fromEntries(SERVICE_TYPES.map((x) => [x.id, x]));
export const CATEGORIES: Category[] = [
  "Clients", "Hosts", "Compute", "Databases", "Caches", "Storage", "Network", "Messaging",
  "Data & analytics", "Search & vector", "AI", "Observability", "Security & identity", "Product & business", "Media & realtime", "Dev & delivery",
];
