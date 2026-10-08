import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/pages/PageSkeleton";
import { PriceCards } from "@/components/pages/PriceCards";
import { APP_NAME } from "@/lib/brand";
import { billingEnabled, hasCustomer } from "@/server/billing";
import { getPlan } from "@/server/plans";
import { currentUser } from "@/server/session";
import "./upgrade.css";

export const metadata: Metadata = { title: `Pro plan | ${APP_NAME}` };

async function Body({ searchParams }: { searchParams: Promise<{ checkout?: string; billing?: string }> }) {
  await connection();
  const u = await currentUser();
  if (!u) redirect("/login?next=/upgrade");
  const q = await searchParams;
  const plan = await getPlan(u.id);
  const notice = q.checkout === "done" ? (plan === "pro" ? "Payment received. Pro is on." : "Payment received. Pro switches on in a moment; refresh if it does not.") : q.billing ? "Could not open billing. Try again, or contact us." : undefined;
  return (
    <main className="pm wide up">
      <h1>Free to learn. <em>Pro</em> to work faster.</h1>
      <p className="lede">Sketching, estimating and sharing stay free. Pro adds exports, teams and, later, an AI agent that builds the system from a description.</p>
      <PriceCards pro={plan === "pro"} billing={billingEnabled()} manage={await hasCustomer(u.id)} notice={notice} />
    </main>
  );
}

export default function Upgrade({ searchParams }: { searchParams: Promise<{ checkout?: string; billing?: string }> }) {
  return <Suspense fallback={<PageSkeleton />}><Body searchParams={searchParams} /></Suspense>;
}
