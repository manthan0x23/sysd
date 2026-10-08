import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/pages/PageSkeleton";
import { PriceCards } from "@/components/pages/PriceCards";
import { APP_NAME } from "@/lib/brand";
import { getPlan } from "@/server/plans";
import { currentUser } from "@/server/session";
import "./upgrade.css";

export const metadata: Metadata = { title: `Pro plan | ${APP_NAME}` };

async function Body() {
  await connection();
  const u = await currentUser();
  if (!u) redirect("/login?next=/upgrade");
  return (
    <main className="pm wide up">
      <h1>Free to learn. <em>Pro</em> to work faster.</h1>
      <p className="lede">Sketching, estimating and sharing stay free. Pro adds exports, teams and, later, an AI agent that builds the system from a description.</p>
      <PriceCards pro={(await getPlan(u.id)) === "pro"} />
    </main>
  );
}

export default function Upgrade() {
  return <Suspense fallback={<PageSkeleton />}><Body /></Suspense>;
}
