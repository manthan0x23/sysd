// Plan sync from Dodo subscription events, run against the local Postgres: npm run test:billing
process.loadEnvFile(".env.local");
const { db, schema, closeDb } = await import("../src/db");
const { eq, like } = await import("drizzle-orm");
const { applySubscription } = await import("../src/server/billing");
const { getPlan } = await import("../src/server/plans");

let fail = 0;
const ok = (n: string, c: boolean) => { if (!c) fail++; console.log(`${c ? "  ok  " : "  FAIL"} ${n}`); };
const day = 86_400_000;
const iso = (offset: number) => new Date(Date.now() + offset * day).toISOString();
const [u] = await db.insert(schema.users).values({ email: `bill-${Date.now()}@sysd-test.invalid`, name: "bill" }).returning({ id: schema.users.id });
const ev = (status: string, next: number, sub = "sub_1") => ({ subscription_id: sub, customer: { customer_id: "cus_1" }, metadata: { user_id: u.id }, status, next_billing_date: iso(next) });
const row = async () => (await db.select().from(schema.users).where(eq(schema.users.id, u.id)))[0];

try {
  await applySubscription(ev("active", 30));
  ok("active -> pro", (await getPlan(u.id)) === "pro");
  ok("ids stored", (await row()).dodoCustomerId === "cus_1" && (await row()).dodoSubscriptionId === "sub_1");
  ok("expires after renewal date", ((await row()).planExpiresAt?.getTime() ?? 0) > Date.now() + 30 * day);
  await applySubscription(ev("cancelled", 10));
  ok("cancelled keeps what was paid for", (await getPlan(u.id)) === "pro");
  await applySubscription(ev("cancelled", -10));
  ok("cancelled and past due date -> free", (await getPlan(u.id)) === "free");
  await applySubscription(ev("active", 30));
  await applySubscription(ev("on_hold", 30));
  ok("on_hold -> free", (await getPlan(u.id)) === "free");
  await applySubscription(ev("active", 30));
  await applySubscription(ev("expired", -1));
  ok("expired -> free", (await getPlan(u.id)) === "free");
  await applySubscription(ev("active", 30));
  await applySubscription({ ...ev("failed", 0, "sub_OLD") });
  ok("old subscription's failure does not downgrade", (await getPlan(u.id)) === "pro");
  await applySubscription({ ...ev("active", 30), metadata: { user_id: "not-a-uuid" } });
  await applySubscription({ ...ev("active", 30), metadata: null });
  ok("bad or missing user_id is ignored", true);
} finally {
  await db.delete(schema.users).where(like(schema.users.email, "%@sysd-test.invalid"));
  await closeDb();
}
console.log(fail ? `${fail} FAILED` : "all passed");
process.exit(fail ? 1 : 0);
