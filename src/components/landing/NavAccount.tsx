import Link from "next/link";
import { Crown } from "lucide-react";
import { connection } from "next/server";
import { Suspense } from "react";
import { Avatar } from "@/components/Avatar";
import { PLAN_LABEL } from "@/lib/brand";
import { getPlan } from "@/server/plans";
import { currentUser } from "@/server/session";

/** Who is signed in, or the Sign in link. Read per request, so it sits in Suspense and the rest of the page stays static. */
async function Who() {
  await connection();
  const u = await currentUser();
  if (!u) return <Link href="/login" className="lp-signin">Sign in</Link>;
  const plan = await getPlan(u.id);
  return (
    <>
    {plan === "free" && <Link href="/upgrade" className="lp-gopro"><Crown size={14} aria-hidden />Go Pro</Link>}
    <Link href="/home" className="lp-acct" title={`${u.name}: open your designs`}>
      <Avatar value={u.avatar} name={u.name} size={28} />
      <span className="lp-acct-name">{u.name.split(" ")[0]}</span>
      <span className={`lp-plan ${plan}`}>{PLAN_LABEL[plan]}</span>
    </Link>
    </>
  );
}

export function NavAccount() {
  return <Suspense fallback={<span className="lp-acct-skel" aria-hidden />}><Who /></Suspense>;
}
