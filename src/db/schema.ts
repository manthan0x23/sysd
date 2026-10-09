import { sql } from "drizzle-orm";
import type { Profile } from "@/lib/profile";
import { index, integer, jsonb, numeric, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

/** free: sketch, estimate, save designs. pro: also the AI agent and teams. */
export const plan = pgEnum("plan", ["free", "pro"]);
/** The owner of a team is implicit (teams.owner_id); members are viewers or editors. */
export const teamRole = pgEnum("team_role", ["viewer", "editor"]);
/** draft: work in progress, autosaved. saved: kept on purpose. */
export const designStatus = pgEnum("design_status", ["draft", "saved"]);

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email"),
  name: text("name"),
  /** Chosen avatar, a short spec string (see src/lib/avatar.ts). The sign-in provider photo is deliberately not kept. */
  avatar: text("avatar"),
  plan: plan("plan").notNull().default("free"),
  /** Null means the plan does not expire (free, or a manually granted pro). */
  planExpiresAt: ts("plan_expires_at"),
  createdAt: ts("created_at").notNull().defaultNow(),
  lastLoginAt: ts("last_login_at").notNull().defaultNow(),
  /** Optional answers from the welcome screen. They give the AI agent context; every one can stay empty. */
  profile: jsonb("profile").$type<Profile>(),
  /** Dodo Payments ids, set by the billing webhook. The subscription decides plan and planExpiresAt. */
  dodoCustomerId: text("dodo_customer_id"),
  dodoSubscriptionId: text("dodo_subscription_id"),
  /** Set when the welcome screen was finished or skipped, so it is only offered once. */
  onboardedAt: ts("onboarded_at"),
});

/**
 * One row per sign-in method. Identities are never merged by email address: a GitHub email can be
 * unverified, and merging on it would let someone take over another person's profile.
 */
export const identities = pgTable("identities", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  email: text("email"),
  createdAt: ts("created_at").notNull().defaultNow(),
}, (t) => [uniqueIndex("identities_provider_account_uq").on(t.provider, t.providerAccountId), index("identities_user_idx").on(t.userId)]);

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  /** Team logo, an avatar spec (see src/lib/avatar.ts): a letter, a bundled logo, a character or an uploaded image. */
  logo: text("logo"),
  createdAt: ts("created_at").notNull().defaultNow(),
}, (t) => [index("teams_owner_idx").on(t.ownerId)]);

export const teamMembers = pgTable("team_members", {
  teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: teamRole("role").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.teamId, t.userId] }), index("team_members_user_idx").on(t.userId)]);

/** Invite links. Only a hash of the token is stored, so a database leak cannot be used to join a team. */
export const teamInvites = pgTable("team_invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  role: teamRole("role").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  createdBy: uuid("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: ts("created_at").notNull().defaultNow(),
  expiresAt: ts("expires_at").notNull(),
  acceptedAt: ts("accepted_at"),
  acceptedBy: uuid("accepted_by").references(() => users.id, { onDelete: "set null" }),
  revokedAt: ts("revoked_at"),
}, (t) => [index("team_invites_team_idx").on(t.teamId)]);

export const designs = pgTable("designs", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  /** Null means a personal design; set means it belongs to that team. */
  teamId: uuid("team_id").references(() => teams.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("Untitled design"),
  status: designStatus("status").notNull().default("draft"),
  /** The whole canvas: nodes, links, workload. Validated on every write (see server/doc.ts). */
  doc: jsonb("doc").notNull(),
  /** A small SVG preview of the canvas, drawn on the server at each save (see server/thumb.ts). */
  thumb: text("thumb"),
  /** Bumped on every write; a save with a stale revision is refused instead of overwriting. */
  rev: integer("rev").notNull().default(1),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
}, (t) => [index("designs_owner_idx").on(t.ownerId, t.updatedAt), index("designs_team_idx").on(t.teamId, t.updatedAt)]);

/** A read-only link to a design. The token is the capability; revoking the link ends access. */
export const shares = pgTable("shares", {
  id: uuid("id").primaryKey().defaultRandom(),
  designId: uuid("design_id").notNull().references(() => designs.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  createdBy: uuid("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: ts("created_at").notNull().defaultNow(),
  expiresAt: ts("expires_at"),
  revokedAt: ts("revoked_at"),
  /** How many times the link was opened by someone other than its creator. */
  viewCount: integer("view_count").notNull().default(0),
  lastViewedAt: ts("last_viewed_at"),
}, (t) => [index("shares_design_idx").on(t.designId)]);

/**
 * Real prices (PLAN.md section C). Nothing here is read by the app until a row is `approved` and published as a
 * snapshot. pending: just scraped, nobody checked it. approved: a human checked it against `price_sources.url`.
 * rejected: checked and wrong. superseded: was approved, replaced by a newer approved row with the same `key`.
 */
export const priceStatus = pgEnum("price_status", ["pending", "approved", "rejected", "superseded"]);
/** api: the provider's own price endpoint. scrape: a pricing page read with Firecrawl. */
export const priceSourceKind = pgEnum("price_source_kind", ["api", "scrape"]);

/** One fetch of one provider. Every price row points here, so each price has a URL and a date. */
export const priceSources = pgTable("price_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Catalog provider slug, for example "hetzner" (see src/lib/catalog/offerings.ts). */
  provider: text("provider").notNull(),
  kind: priceSourceKind("kind").notNull(),
  /** The human-checkable page. For an API source this is the pricing page, with the endpoint in `meta.api`. */
  url: text("url").notNull(),
  /** All pages read for this fetch (scrapes often use several). */
  urls: text("urls").array().notNull().default(sql`'{}'::text[]`),
  fetchedAt: ts("fetched_at").notNull(),
  /** Provider-side version or publication date when the API gives one (AWS priceListVersion, Oracle lastUpdated). */
  version: text("version"),
  /** Free text from the extractor: what was skipped, what to check. */
  notes: text("notes"),
  /** Anything else worth keeping (api endpoint, region, truncated flag). */
  meta: jsonb("meta"),
  createdAt: ts("created_at").notNull().defaultNow(),
}, (t) => [index("price_sources_provider_idx").on(t.provider, t.fetchedAt)]);

/**
 * A plan or SKU with specs: "Hetzner CPX22", "Neon Launch", "Stripe cards". `spec` holds whatever applies (vcpu,
 * ramGb, diskGb, transferGb, connections, ...). Pay-per-use prices go in `rates` (name, amount, unit), never as a
 * made-up monthly number. `amount` is null when the tier has no flat price (rates only, or contact sales).
 */
export const priceTiers = pgTable("price_tiers", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceId: uuid("source_id").notNull().references(() => priceSources.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  /** Catalog offering ids this tier prices, for example "vps:hetzner:cloud-servers". One tier can price several. */
  offerings: text("offerings").array().notNull(),
  tier: text("tier").notNull(),
  region: text("region"),
  /** Stable identity across fetches: provider + offerings + tier + region. Used to find the row a new fetch replaces. */
  key: text("key").notNull(),
  spec: jsonb("spec").$type<Record<string, string | number | boolean | null>>().notNull().default({}),
  amount: numeric("amount", { precision: 20, scale: 6 }),
  unit: text("unit"),
  currency: text("currency").notNull(),
  /** Hourly price when the provider bills by the hour; amount stays the monthly cap. */
  hourly: numeric("hourly", { precision: 20, scale: 8 }),
  /** Usage prices: [{ name, amount, unit }]. */
  rates: jsonb("rates").$type<{ name: string; amount: number; unit: string }[]>(),
  /** Everything else the extractor kept (introPrice, listPrice, perSecond, regionPrices, contact). */
  extra: jsonb("extra"),
  note: text("note"),
  status: priceStatus("status").notNull().default("pending"),
  reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: ts("reviewed_at"),
  createdAt: ts("created_at").notNull().defaultNow(),
}, (t) => [
  uniqueIndex("price_tiers_source_key_uq").on(t.sourceId, t.key),
  index("price_tiers_provider_idx").on(t.provider, t.status),
  index("price_tiers_key_idx").on(t.key),
  index("price_tiers_offerings_idx").using("gin", t.offerings),
]);

/**
 * Raw per-unit prices from bulk APIs (AWS, Azure, Oracle, Scaleway): about 64,000 rows, too fine to review one by
 * one, so they are approved per source. `attrs` keeps the provider's own attributes (instanceType, vcpu, engine).
 */
export const priceRates = pgTable("price_rates", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceId: uuid("source_id").notNull().references(() => priceSources.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  /** Provider service code, for example "AmazonEC2" or the Azure service name. */
  service: text("service").notNull(),
  offerings: text("offerings").array().notNull().default(sql`'{}'::text[]`),
  region: text("region"),
  /** Provider SKU / meter id when there is one. */
  sku: text("sku"),
  key: text("key").notNull(),
  description: text("description"),
  unit: text("unit").notNull(),
  amount: numeric("amount", { precision: 24, scale: 10 }).notNull(),
  currency: text("currency").notNull(),
  /** Volume tier start (for example "first 50 TB"); 0 when the price is flat. */
  tierMin: numeric("tier_min", { precision: 24, scale: 6 }),
  attrs: jsonb("attrs"),
  status: priceStatus("status").notNull().default("pending"),
  createdAt: ts("created_at").notNull().defaultNow(),
}, (t) => [
  uniqueIndex("price_rates_source_key_uq").on(t.sourceId, t.key),
  index("price_rates_provider_idx").on(t.provider, t.service, t.status),
  index("price_rates_offerings_idx").using("gin", t.offerings),
]);

/** Set once a snapshot has been published, so the app knows which version it is serving. */
export const priceSnapshots = pgTable("price_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  version: integer("version").notNull().unique(),
  tierCount: integer("tier_count").notNull(),
  rateCount: integer("rate_count").notNull(),
  sha256: text("sha256").notNull(),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const now = sql`now()`;
