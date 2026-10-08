import { eq } from "drizzle-orm";
import DodoPayments from "dodopayments";
import { db, schema } from "@/db";
import { UserError } from "./doc";

export type Interval = "month" | "year";

const env = (k: string) => process.env[k]?.trim() || "";
/** INR has its own products (a Dodo product has one base currency); without them INR falls back to converting the USD one. */
const productFor = (i: Interval, currency: "USD" | "INR" = "USD") =>
  (currency === "INR" && env(i === "month" ? "DODO_PRODUCT_PRO_MONTH_INR" : "DODO_PRODUCT_PRO_YEAR_INR")) || env(i === "month" ? "DODO_PRODUCT_PRO_MONTH" : "DODO_PRODUCT_PRO_YEAR");

/** Billing is off until the keys and both products are configured, so the upgrade button stays inert. */
export const billingEnabled = () => !!(env("DODO_PAYMENTS_API_KEY") && env("DODO_PAYMENTS_WEBHOOK_KEY") && productFor("month") && productFor("year"));

export const dodo = () => new DodoPayments({
  bearerToken: env("DODO_PAYMENTS_API_KEY"),
  environment: env("DODO_PAYMENTS_ENVIRONMENT") === "live_mode" ? "live_mode" : "test_mode",
});

/** Card payments can settle a few days late; keep Pro this long past the renewal date before dropping it. */
const GRACE_MS = 3 * 86_400_000;

export async function startCheckout(user: { id: string; name: string; email: string | null }, interval: Interval, currency: "USD" | "INR", returnUrl: string) {
  if (!billingEnabled()) throw new UserError("Payments are not open yet.");
  if (!user.email) throw new UserError("Your sign-in provider did not share an email address, so we cannot bill you.");
  const [u] = await db.select({ plan: schema.users.plan, exp: schema.users.planExpiresAt }).from(schema.users).where(eq(schema.users.id, user.id)).limit(1);
  if (u?.plan === "pro" && (!u.exp || u.exp.getTime() > Date.now())) throw new UserError("You are already on Pro.");
  const session = await dodo().checkoutSessions.create({
    product_cart: [{ product_id: productFor(interval, currency), quantity: 1 }],
    customer: { email: user.email, name: user.name },
    billing_currency: currency,
    // The webhook finds the account from this, never from the email address.
    metadata: { user_id: user.id },
    return_url: returnUrl,
  });
  if (!session.checkout_url) throw new UserError("Could not start checkout. Try again.");
  return session.checkout_url;
}

export async function portalUrl(userId: string) {
  const [u] = await db.select({ c: schema.users.dodoCustomerId }).from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  if (!u?.c) throw new UserError("There is no subscription on this account.");
  return (await dodo().customers.customerPortal.create(u.c)).link;
}

interface SubData { subscription_id: string; customer: { customer_id: string }; metadata?: Record<string, string> | null; status: string; next_billing_date: string }

/**
 * Sets the plan from the subscription's own state, so replayed or out-of-order events cannot leave it wrong:
 * active keeps Pro past the next renewal date, cancelled keeps what was paid for, everything else is Free.
 */
export async function applySubscription(d: SubData) {
  const userId = d.metadata?.user_id;
  if (!userId || !/^[0-9a-f-]{36}$/.test(userId)) { console.warn("dodo webhook without a valid user_id", d.subscription_id); return; }
  const [u] = await db.select({ sub: schema.users.dodoSubscriptionId }).from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  if (!u) return;
  // A different, older subscription must not overwrite the one on file unless it is the live one.
  if (u.sub && u.sub !== d.subscription_id && d.status !== "active") return;
  const renews = new Date(d.next_billing_date).getTime();
  const paidThrough = Number.isFinite(renews) ? new Date(renews + GRACE_MS) : null;
  const pro = d.status === "active" || (d.status === "cancelled" && paidThrough != null && paidThrough.getTime() > Date.now());
  await db.update(schema.users).set({
    plan: pro ? "pro" : "free", planExpiresAt: pro ? paidThrough : null,
    dodoCustomerId: d.customer.customer_id, dodoSubscriptionId: d.subscription_id,
  }).where(eq(schema.users.id, userId));
}

export async function hasCustomer(userId: string) {
  const [u] = await db.select({ c: schema.users.dodoCustomerId }).from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  return !!u?.c;
}
