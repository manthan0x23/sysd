import Link from "next/link";
import { Crown } from "lucide-react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { signOutAction } from "@/app/actions";
import { Logo } from "@/components/Logo";
import { AmbientFlow } from "@/components/pages/AmbientFlow";
import { ThemeToggle } from "@/components/studio/ThemeToggle";
import { NavLinks } from "@/components/pages/NavLinks";
import { APP_NAME, PLAN_LABEL } from "@/lib/brand";
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
      {plan === "free" && <Link href="/upgrade" className="ph-gopro"><Crown size={14} aria-hidden /><span>Go Pro</span></Link>}
      <Link href="/upgrade" className={`ph-plan ${plan}`} title={plan === "pro" ? "Your Pro plan" : "Starter plan. See what Pro adds"}>{PLAN_LABEL[plan]}</Link>
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
      <AmbientFlow />
      <header className="ph">
        <Link href="/home" className="ph-logo" aria-label={`${APP_NAME} home`}><Logo size={24} />{APP_NAME}</Link>
        <NavLinks />
        <span className="ph-grow" />
        <ThemeToggle />
        <Link href="/app?fresh=n" className="btn-sm ph-new">New design</Link>
        <Suspense fallback={<span className="ph-who skel" aria-hidden />}><Who /></Suspense>
      </header>
      {children}
    </>
  );
}
