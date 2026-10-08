import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { signOutAction } from "@/app/actions";
import { Logo } from "@/components/Logo";
import { NavLinks } from "@/components/pages/NavLinks";
import { APP_NAME } from "@/lib/brand";
import { getPlan } from "@/server/plans";
import { currentUser } from "@/server/session";
import "./pages.css";

/** The part of the header that depends on who you are. Everything else renders instantly. */
async function Who() {
  await connection();
  const u = await currentUser();
  if (!u) redirect("/login");
  const plan = await getPlan(u.id);
  return (
    <>
      <span className={`ph-plan ${plan}`} title={plan === "pro" ? "Pro: AI agent and teams" : "Free plan"}>{plan === "pro" ? "Pro" : "Free"}</span>
      <span className="ph-name">{u.name}</span>
      <form action={signOutAction}><button className="ph-link" type="submit">Sign out</button></form>
    </>
  );
}

/**
 * One header for designs, teams and invites. It lives in the layout, so moving between those pages
 * never tears it down: only the content underneath changes.
 */
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="ph">
        <Link href="/home" className="ph-logo" aria-label={`${APP_NAME} home`}><Logo size={24} />{APP_NAME}</Link>
        <NavLinks />
        <span className="ph-grow" />
        <Link href="/app?fresh=n" className="btn-sm ph-new">New design</Link>
        <Suspense fallback={<span className="ph-who skel" aria-hidden />}><Who /></Suspense>
      </header>
      {children}
    </>
  );
}
