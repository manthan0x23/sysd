import type { LucideIcon } from "lucide-react";

export type Role = "source" | "edge" | "compute" | "db" | "cache" | "storage" | "stream" | "service" | "host";

export type Category =
  | "Clients" | "Compute" | "Hosts" | "Databases" | "Caches" | "Storage" | "Network"
  | "Messaging" | "Data & analytics" | "Search & vector" | "AI" | "Observability"
  | "Security & identity" | "Dev & delivery" | "Product & business" | "Media & realtime";

/** How an offering is run: provider-managed, scale-to-zero, on your own server, or a SaaS product. */
export type Model = "managed" | "serverless" | "self-hosted" | "saas";

export type Bucket = "compute" | "storage" | "transfer" | "managed" | "people";
export type TypeId = string;

export interface Need { cpu: number; ramGb: number; diskGb: number }
export interface SizingCtx { rps: number; dataGb: number; readPct: number }

/** How much of a server a service needs when you run it yourself. */
export interface SizingProfile {
  run: (c: SizingCtx) => Need;
  /** Human-readable formula so the assumption is visible and can be challenged. */
  basis: string;
  /** "rule-of-thumb" until each constant is tied to a vendor sizing doc or benchmark. */
  confidence: "rule-of-thumb" | "sourced";
}

export interface ServiceType {
  id: TypeId;
  label: string;
  /** Compact name for canvas nodes. */
  short?: string;
  category: Category;
  role: Role;
  icon: LucideIcon;
  /** Illustrative capacity (requests per second); null = unlimited. */
  cap: number | null;
  /** Illustrative base latency in ms. */
  ms: number;
  /** Illustrative monthly cost: base + perRps * load. Replaced by real prices in Phase 2. */
  base: number;
  perRps: number;
  bucket: Bucket | null;
  hostable?: SizingProfile;
  /** Group blocks that hold other nodes. */
  host?: "server" | "container";
}

export interface Offering {
  id: string;
  typeId: TypeId;
  provider: string;
  product: string;
  model: Model;
}

export interface Spec { vcpu: number; ramGb: number; diskGb: number }

/**
 * What a free tier includes, where the provider states it as a number. A free tier only "fits" when every limit we know
 * covers the load; limits we do not know are never assumed, so a tier with none is listed but never picked by Auto.
 */
export interface Limits {
  storageGb?: number;
  ramGb?: number;
  vcpu?: number;
  /** Requests (or invocations, queries, messages) per month. */
  requestsPerMonth?: number;
  /** vCPU-hours (or compute units x hours) per month. */
  computeHours?: number;
  /** Monthly active users, for auth, analytics and similar. */
  users?: number;
  /** Outbound transfer in GB per month. */
  egressGb?: number;
}

/** A tier you can pick: a server size, or an LLM model. Each one carries where its numbers came from. */
export interface Plan {
  id: string;
  label: string;
  /** Server specs; absent for non-server plans such as LLM models. */
  spec?: Spec;
  /** Sustained monthly price in USD (renewal price where an intro price exists). */
  price?: number;
  /** A $0 plan. Its `limits` say how much it covers; beyond them the next tier applies. */
  free?: boolean;
  limits?: Limits;
  /** Promotional price, shown but never used for the estimate. */
  priceIntro?: number;
  /** Per-token pricing for LLM models, USD per million tokens. */
  tokens?: { inPerM: number; outPerM: number; cachedPerM?: number };
  source?: string;
  fetchedAt?: string;
  note?: string;
}

export const BUCKETS: Bucket[] = ["compute", "storage", "transfer", "managed", "people"];
