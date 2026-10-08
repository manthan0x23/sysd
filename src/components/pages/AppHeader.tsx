import Link from "next/link";
import { signOutAction } from "@/app/actions";
import { Logo } from "@/components/Logo";
import { APP_NAME } from "@/lib/brand";
import type { SessionUser } from "@/server/session";

/** Header for the list pages (designs, teams, invites). The canvas has its own nav. */
export function AppHeader({ user, plan, here }: { user: SessionUser; plan: "free" | "pro"; here: "designs" | "teams" | "invite" }) {
  return (
    <header className="ph">
      <Link href="/" className="ph-logo" aria-label={`${APP_NAME} home`}><Logo size={24} />{APP_NAME}</Link>
      <nav aria-label="Account">
        <Link href="/app" className="ph-link">Canvas</Link>
        <Link href="/designs" className="ph-link" aria-current={here === "designs" ? "page" : undefined}>Designs</Link>
        <Link href="/teams" className="ph-link" aria-current={here === "teams" ? "page" : undefined}>Teams</Link>
      </nav>
      <span className="ph-grow" />
      <span className={`ph-plan ${plan}`} title={plan === "pro" ? "Pro: AI agent and teams" : "Free plan"}>{plan === "pro" ? "Pro" : "Free"}</span>
      <span className="ph-name">{user.name}</span>
      <form action={signOutAction}><button className="ph-link" type="submit">Sign out</button></form>
    </header>
  );
}
