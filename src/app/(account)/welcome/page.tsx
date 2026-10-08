import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/pages/PageSkeleton";
import { WelcomeForm } from "@/components/pages/WelcomeForm";
import { APP_NAME } from "@/lib/brand";
import { currentUser } from "@/server/session";
import "../upgrade/upgrade.css";

export const metadata: Metadata = { title: `Welcome | ${APP_NAME}`, robots: { index: false, follow: false } };

async function Body() {
  await connection();
  if (!(await currentUser())) redirect("/login?next=/welcome");
  return (
    <main className="pm narrow">
      <h1>Welcome to {APP_NAME}</h1>
      <p className="lede">A few quick questions so the tool, and later the AI agent, can fit what you are doing. Everything is optional and you can skip it.</p>
      <WelcomeForm />
    </main>
  );
}

export default function Welcome() {
  return <Suspense fallback={<PageSkeleton />}><Body /></Suspense>;
}
