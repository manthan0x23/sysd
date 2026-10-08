import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { Logo } from "@/components/Logo";
import { PROVIDERS } from "@/auth";
import { currentUser } from "@/server/session";
import { BrandIcon } from "@/components/studio/BrandIcon";
import { APP_NAME } from "@/lib/brand";
import { safeNext } from "@/lib/safeNext";
import { signInWith } from "../actions";
import "./login.css";

export const metadata: Metadata = { title: `Sign in | ${APP_NAME}` };

const ICON: Record<string, string> = { github: "logos:github-icon", google: "logos:google-icon" };

async function LoginBody({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  await connection(); // the session is per request, so this cannot be prerendered
  const next = safeNext((await searchParams).next);
  if (await currentUser()) redirect(next);
  return (
    <main className="login">
      <Link href="/" className="login-logo"><Logo size={26} />{APP_NAME}</Link>
      <section className="login-card" aria-labelledby="login-h">
        <h1 id="login-h">Sign in to <em>{APP_NAME}</em></h1>
        <p>Your designs live in your profile, so everything here starts with a GitHub or Google account. There are no passwords and no email sign-up.</p>
        <div className="login-buttons">
          {PROVIDERS.map((p) => (
            <form key={p.id} action={signInWith.bind(null, p.id, next)}>
              <button type="submit" disabled={!p.configured} className="login-btn">
                <BrandIcon id={ICON[p.id]} size={20} />
                <span>Continue with {p.name}</span>
                {!p.configured && <small>not set up yet</small>}
              </button>
            </form>
          ))}
        </div>
        {PROVIDERS.some((p) => !p.configured) && (
          <p className="login-note">A provider shows “not set up yet” until its client ID and secret are in <code>.env.local</code>. See <code>.env.example</code>.</p>
        )}
        <p className="login-fine">We receive your name, email address and profile picture from the provider, and nothing else.</p>
      </section>
    </main>
  );
}

export default function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return (
    <Suspense fallback={<main className="login" aria-busy="true" />}>
      <LoginBody searchParams={searchParams} />
    </Suspense>
  );
}
