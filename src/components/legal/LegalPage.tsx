import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { APP_NAME, CONTACT_EMAIL, LEGAL_UPDATED } from "@/lib/brand";
import "./legal.css";

export function Contact() {
  return CONTACT_EMAIL ? <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> : <>the contact address listed on sysd.live</>;
}

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="legal">
      <header><Link href="/" className="legal-logo"><Logo size={24} />{APP_NAME}</Link></header>
      <article>
        <h1>{title}</h1>
        <p className="legal-date">Last updated {LEGAL_UPDATED}</p>
        {children}
        <nav className="legal-nav" aria-label="Legal"><Link href="/terms">Terms of Service</Link><Link href="/privacy">Privacy Policy</Link><Link href="/">Home</Link></nav>
      </article>
    </main>
  );
}
