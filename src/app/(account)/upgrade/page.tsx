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

function Faq({ billing }: { billing: boolean }) {
  const items: [string, string][] = [
    ["Am I charged today?", billing ? "Only if you press Upgrade and finish checkout. Test mode may be on while we set things up." : "No. Payments are not open yet, so nothing can be charged."],
    ["Can I cancel?", "Yes. Cancelling stops renewal, and Pro stays on until the end of the period you paid for."],
    ["Which currencies can I pay in?", "US dollars or Indian rupees. The rupee prices are set lower on purpose, not converted."],
    ["What happens to my designs if I leave Pro?", "They stay. You keep Starter, so you can still open, edit and share them. Exports and team creation switch off."],
    ["What will the AI agent do?", "You describe your app and how many users you expect. It proposes a system, picks services and plans that fit, and shows where you can spend less, like an engineer would. It is part of Pro and arrives in a later release. Pro today means exports and teams."],
  ];
  return (
    <section className="faq" aria-labelledby="faq-h">
      <h2 id="faq-h">Questions</h2>
      {items.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
    </section>
  );
}

async function Body({ searchParams }: { searchParams: Promise<{ checkout?: string; billing?: string }> }) {
  await connection();
  const u = await currentUser();
  if (!u) redirect("/login?next=/upgrade");
  const q = await searchParams;
  const plan = await getPlan(u.id);
  const notice = q.checkout === "done" ? (plan === "pro" ? "Payment received. Pro is on." : "Payment received. Pro switches on in a moment; refresh if it does not.") : q.billing ? "Could not open billing. Try again, or contact us." : undefined;
  return (
    <main className="pm wide up">
      <h1>Learn on Starter. <em>Go Pro</em> to work faster.</h1>
      <p className="lede">Sketching, estimating and sharing are in Starter. Pro adds exports, teams and, later, an AI architect: tell it about your app and the users you expect, and it designs the system and finds where to cut cost.</p>
      <PriceCards pro={plan === "pro"} billing={billingEnabled()} manage={await hasCustomer(u.id)} notice={notice} />
      <Faq billing={billingEnabled()} />
    </main>
  );
}

export default function Upgrade({ searchParams }: { searchParams: Promise<{ checkout?: string; billing?: string }> }) {
  return <Suspense fallback={<PageSkeleton />}><Body searchParams={searchParams} /></Suspense>;
}
