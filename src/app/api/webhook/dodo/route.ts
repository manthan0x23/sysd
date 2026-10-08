import { NextResponse, type NextRequest } from "next/server";
import { Webhooks } from "@dodopayments/nextjs";
import { applySubscription } from "@/server/billing";

type Sub = Parameters<typeof applySubscription>[0];
const sync = async (p: { data: unknown }) => applySubscription(p.data as Sub);

// Built per request: the adaptor throws on an empty key, and the build has no secrets.
// The adaptor checks the signature, so unsigned requests get 401. An error thrown here returns 500 and Dodo retries.
export async function POST(req: NextRequest) {
  const webhookKey = process.env.DODO_PAYMENTS_WEBHOOK_KEY;
  if (!webhookKey) return NextResponse.json({ error: "Billing is not configured." }, { status: 503 });
  return Webhooks({
    webhookKey,
    onSubscriptionActive: sync, onSubscriptionRenewed: sync, onSubscriptionPlanChanged: sync, onSubscriptionUpdated: sync,
    onSubscriptionCancelled: sync, onSubscriptionOnHold: sync, onSubscriptionFailed: sync, onSubscriptionExpired: sync,
  })(req);
}
