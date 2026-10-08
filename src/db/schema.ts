import { sql } from "drizzle-orm";
import { index, integer, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

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
  image: text("image"),
  plan: plan("plan").notNull().default("free"),
  /** Null means the plan does not expire (free, or a manually granted pro). */
  planExpiresAt: ts("plan_expires_at"),
  createdAt: ts("created_at").notNull().defaultNow(),
  lastLoginAt: ts("last_login_at").notNull().defaultNow(),
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

export const now = sql`now()`;
