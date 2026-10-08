// Integration test for the access rules, run against the local Postgres: npm run test:db
// Creates throwaway users (email ends in @sysd-test.invalid) and removes them at the end.
process.loadEnvFile(".env.local");
const { db, schema, closeDb } = await import("../src/db");
const { eq, like } = await import("drizzle-orm");
const D = await import("../src/server/designs");
const S = await import("../src/server/shares");
const T = await import("../src/server/teams");
const { UserError } = await import("../src/server/doc");
const { toDoc } = await import("../src/lib/doc");
const { DEFAULT_WORKLOAD } = await import("../src/lib/sim");

let pass = 0, fail = 0;
const ok = (name: string, cond: boolean, extra = "") => { if (cond) pass++; else fail++; console.log(`${cond ? "  ok  " : "  FAIL"} ${name}${cond ? "" : " " + extra}`); };
const rejects = async (name: string, p: Promise<unknown>, match?: RegExp) => {
  try { await p; ok(name, false, "(did not throw)"); } catch (e) { ok(name, e instanceof UserError && (!match || match.test((e as Error).message)), `(threw ${(e as Error).message})`); }
};
const user = async (label: string, plan: "free" | "pro" = "free") =>
  (await db.insert(schema.users).values({ email: `${label}-${Date.now()}@sysd-test.invalid`, name: label, plan }).returning({ id: schema.users.id }))[0].id;

const doc = toDoc([{ id: "n1", type: "card", position: { x: 1, y: 2 }, data: { typeId: "postgres", offeringId: "postgres:aws:rds-for-postgresql" } }], [], DEFAULT_WORKLOAD);

try {
  const [A, B, C, E] = [await user("alice-pro", "pro"), await user("bob"), await user("carol"), await user("eve-outsider")];

  console.log("personal designs");
  const mine = await D.createDesign(A, { title: "  My design  ", doc });
  ok("owner can read their design", (await D.getDesign(A, mine.id)).title === "My design");
  await rejects("another user cannot read it", D.getDesign(B, mine.id));
  await rejects("another user cannot save it", D.saveDesign(B, mine.id, { title: "hack", baseRev: 1 }));
  await rejects("another user cannot delete it", D.deleteDesign(B, mine.id));
  ok("default status is draft", (await D.getDesign(A, mine.id)).status === "draft");

  console.log("revisions");
  const s1 = await D.saveDesign(A, mine.id, { title: "v2", status: "saved", baseRev: 1 });
  ok("save bumps the revision", s1.rev === 2);
  await rejects("a stale revision is refused, not overwritten", D.saveDesign(A, mine.id, { title: "stale", baseRev: 1 }), /Someone else saved/);
  ok("the refused save changed nothing", (await D.getDesign(A, mine.id)).title === "v2");

  console.log("validation");
  await rejects("unknown service type is rejected", D.createDesign(A, { doc: { ...doc, nodes: [{ ...doc.nodes[0], type: "nope" }] } }));
  await rejects("link to a missing node is rejected", D.createDesign(A, { doc: { ...doc, edges: [{ id: "e", from: "n1", to: "ghost" }] } }));
  await rejects("missing parent is rejected", D.createDesign(A, { doc: { ...doc, nodes: [{ ...doc.nodes[0], parent: "ghost" }] } }));
  await rejects("non-image icon is rejected", D.createDesign(A, { doc: { ...doc, nodes: [{ ...doc.nodes[0], icon: "data:text/html;base64,PHNjcmlwdD4=" }] } }));
  await rejects("oversized design is rejected", D.createDesign(A, { doc: { ...doc, nodes: Array.from({ length: 401 }, (_, i) => ({ ...doc.nodes[0], id: "x" + i })) } }));
  ok("a valid image icon is accepted", !!(await D.createDesign(A, { doc: { ...doc, nodes: [{ ...doc.nodes[0], icon: "data:image/png;base64,iVBORw0KGgo=" }] } })).id);

  console.log("plan gating");
  await rejects("free user cannot create a team", T.createTeam(B, "Nope"), /Pro/);
  await db.update(schema.users).set({ plan: "pro", planExpiresAt: new Date(Date.now() - 1000) }).where(eq(schema.users.id, E));
  await rejects("expired pro cannot create a team", T.createTeam(E, "Nope"), /Pro/);
  const team = await T.createTeam(A, "  Platform   team ");
  ok("pro user creates a team (name tidied)", team.name === "Platform team");

  console.log("invites");
  const invEditor = await T.createInvite(A, team.id, "editor");
  await rejects("only the owner can invite", T.createInvite(B, team.id, "viewer"));
  ok("invite accepted", (await T.acceptInvite(B, invEditor.token)).teamId === team.id);
  await rejects("an invite is single use", T.acceptInvite(C, invEditor.token), /no longer valid/);
  const invViewer = await T.createInvite(A, team.id, "viewer");
  await T.acceptInvite(C, invViewer.token);
  ok("pending invite list hides tokens", (await T.getTeam(A, team.id)).invites.every((i) => !("token" in i) && !("tokenHash" in i)));
  const race = await T.createInvite(A, team.id, "viewer");
  const results = await Promise.allSettled([T.acceptInvite(E, race.token), T.acceptInvite(await user("dave"), race.token)]);
  ok("two people racing for one invite: exactly one wins", results.filter((r) => r.status === "fulfilled").length === 1);
  const expired = await T.createInvite(A, team.id, "editor");
  await db.update(schema.teamInvites).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(schema.teamInvites.createdBy, A));
  await rejects("expired invite is refused", T.acceptInvite(await user("frank"), expired.token));
  const revoked = await T.createInvite(A, team.id, "editor");
  const [pending] = (await T.getTeam(A, team.id)).invites;
  await T.revokeInvite(A, team.id, pending.id);
  await rejects("revoked invite is refused", T.acceptInvite(await user("gina"), revoked.token));
  const old = await T.createInvite(A, team.id, "viewer");
  await T.acceptInvite(B, old.token);
  ok("accepting a viewer invite does not downgrade an editor", (await T.getTeam(A, team.id)).members.find((m) => m.userId === B)?.role === "editor");

  console.log("team designs and roles");
  const td = await D.createDesign(A, { title: "Shared", doc, teamId: team.id });
  ok("editor can open a team design", (await D.getDesign(B, td.id)).level === "edit");
  ok("viewer can open a team design", (await D.getDesign(C, td.id)).level === "view");
  await rejects("outsider cannot open it", D.getDesign(await user("henry"), td.id));
  ok("editor can save", (await D.saveDesign(B, td.id, { title: "edited", baseRev: 1 })).rev === 2);
  await rejects("viewer cannot save", D.saveDesign(C, td.id, { title: "x", baseRev: 2 }), /view-only/);
  await rejects("editor cannot delete", D.deleteDesign(B, td.id), /Only the owner/);
  await rejects("viewer cannot add a design to the team", D.createDesign(C, { doc, teamId: team.id }));
  ok("editor can add a design to the team", !!(await D.createDesign(B, { doc, teamId: team.id })).id);
  await rejects("owner cannot be changed by a member", T.setMemberRole(B, team.id, C, "editor"));
  await T.setMemberRole(A, team.id, C, "editor");
  ok("owner promotes viewer to editor", (await D.getDesign(C, td.id)).level === "edit");
  await rejects("the owner cannot leave their own team", T.removeMember(A, team.id, A));
  await rejects("a member cannot remove someone else", T.removeMember(B, team.id, C));
  await T.removeMember(C, team.id, C);
  await rejects("someone who left loses access", D.getDesign(C, td.id));

  console.log("sharing");
  await rejects("a viewer cannot create a share link", S.createShare(await (async () => { const v = await user("viewer2"); await T.acceptInvite(v, (await T.createInvite(A, team.id, "viewer")).token); return v; })(), td.id));
  const sh = await S.createShare(B, td.id);
  ok("editor creates a share link", sh.token.length >= 20);
  ok("anonymous open works", (await S.openShare(sh.token, null))?.title === "edited");
  await S.openShare(sh.token, await user("reader"));
  await S.openShare(sh.token, B);
  const [row] = await S.listShares(B, td.id);
  ok("views counted for others, not for the creator", row.viewCount === 2, `got ${row.viewCount}`);
  ok("a random token opens nothing", (await S.openShare("A".repeat(22), null)) === null);
  ok("a malformed token opens nothing", (await S.openShare("../../etc", null)) === null);
  await S.revokeShare(A, sh.id);
  ok("revoked link stops working", (await S.openShare(sh.token, null)) === null);

  console.log("deleting");
  await D.deleteDesign(A, td.id);
  await rejects("deleted design is gone", D.getDesign(A, td.id));
  await T.deleteTeam(A, team.id);
  ok("deleting a team removes its designs", (await db.select().from(schema.designs).where(eq(schema.designs.teamId, team.id))).length === 0);
} finally {
  await db.delete(schema.users).where(like(schema.users.email, "%@sysd-test.invalid"));
  await closeDb();
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
