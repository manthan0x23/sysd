import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HeroDecor } from "@/components/landing/HeroDecor";
import { NavAccount } from "@/components/landing/NavAccount";
import { IconRail } from "@/components/landing/IconRail";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/studio/ThemeToggle";
import { APP_NAME } from "@/lib/brand";
import { COUNTS } from "@/lib/catalog";
import "./landing.css";

export const metadata: Metadata = {
  title: `${APP_NAME}: draw a system, see what it costs`,
  description: "Plan your app\'s tech without guesswork. Drag in what it needs, say how many people will use it, and see what it will cost and where it will struggle.",
};

const CTA = "Open the canvas";

function Shot({ name, w, h, alt, priority = false, sizes }: { name: string; w: number; h: number; alt: string; priority?: boolean; sizes: string }) {
  return (
    <>
      <Image className="lp-light" src={`/shots/${name}-light.png`} width={w} height={h} alt={alt} sizes={sizes} priority={priority} />
      <Image className="lp-dark" src={`/shots/${name}-dark.png`} width={w} height={h} alt="" aria-hidden sizes={sizes} />
    </>
  );
}

export default function Landing() {
  return (
    <div className="lp">
      <header className="lp-nav">
        <Link href="/" className="lp-logo" aria-label={`${APP_NAME} home`}><Logo size={26} />{APP_NAME}</Link>
        <nav aria-label="Sections">
          <a href="#how">How it works</a>
        </nav>
        <span className="lp-grow" />
        <ThemeToggle />
        <NavAccount />
        <Link href="/app" className="lp-navcta">{CTA}</Link>
      </header>

      <section className="lp-hero">
        <HeroDecor />
        <h1>Plan your app&apos;s tech.<br /><em>See the bill first.</em></h1>
        <p className="lp-sub">Drag in the pieces your app needs, say how many people will use it, and see what it will cost and where it will struggle. No engineer needed to get started.</p>
        <div className="lp-actions">
          <Link href="/app" className="lp-btn">{CTA}<ArrowRight size={18} aria-hidden /></Link>
          <a href="#how" className="lp-link">How it works</a>
        </div>
        <p className="lp-micro">Open to everyone while we build. Sign in with GitHub or Google.</p>

        <div className="lp-stage">
          <div className="lp-hero-shot"><Shot name="hero" w={2880} h={1960} priority sizes="(max-width: 1100px) 100vw, 1240px" alt="The Sysd canvas: a web app drawn as connected blocks, each showing how full it is, with Postgres highlighted at 82 percent and a panel beside it showing the monthly cost per user and why Postgres is busy." /></div>
        </div>
      </section>

      <p className="lp-rail-cap">Pick from the tools and clouds you already know</p>
      <IconRail />

      <section className="lp-proof" aria-label="What is in the catalog today">
        <div><b>{COUNTS.types}</b><span>building blocks, from databases and queues to payments and AI</span></div>
        <div><b>{COUNTS.offerings}</b><span>ways to run them, from the big clouds to a small server of your own</span></div>
      </section>

      <section className="lp-row">
        <div className="lp-copy">
          <h2>Will it run on the server you are eyeing?</h2>
          <p>Put a database, your app and a cache on a small server, and Sysd tells you straight: it will not fit, and here is what runs short. Choose the next size up and watch the warning disappear. No guessing, and no surprise upgrade the week you launch.</p>
        </div>
        <div className="lp-media lp-frame"><Shot name="fit" w={1052} h={672} sizes="(max-width: 900px) 100vw, 600px" alt="A server block holding Postgres, a Node.js app server and Redis, marked Does not fit, with the meters showing that CPU, memory and disk needed are well over what the server plan offers." /></div>
      </section>

      <section className="lp-row lp-flip">
        <div className="lp-media lp-frame lp-portrait"><Shot name="panel" w={576} h={1360} sizes="(max-width: 900px) 80vw, 340px" alt="The Numbers panel: requests per second, traffic, load, fit and cost per user per month, with a plain-language box explaining why Postgres is at 82 percent." /></div>
        <div className="lp-copy">
          <h2>See your monthly bill, and where it goes.</h2>
          <p>Every design shows what each user costs you per month, split into servers, storage, data transfer, managed services and people&apos;s time. The biggest slice is called out, with the usual way to shrink it.</p>
          <p>When something runs hot, a short note explains why in plain words. Figures marked illustrative are placeholders until real prices load for that provider.</p>
        </div>
      </section>

      <section className="lp-how" id="how">
        <h2>How it works</h2>
        <ol>
          <li><h3>Sketch your idea.</h3><p>Drag in the pieces: a database, a cache, a payment service. Connect them the way data flows. A server can hold other pieces inside it.</p></li>
          <li><h3>Say how busy it gets.</h3><p>How many people, how many requests a second, how much data. Every piece shows how full it is.</p></li>
          <li><h3>Fix the weak spots.</h3><p>Each hot spot explains itself. Swap a plan or a provider and the cost and fit update instantly.</p></li>
        </ol>
      </section>

      <section className="lp-data" id="data">
        <h2>Numbers you can check.</h2>
        <p>Every real price links back to the page it came from and the day we looked, so you never have to take our word for it. Anything we have not verified yet is clearly marked illustrative, so you always know what is solid and what is a placeholder.</p>
      </section>

      <section className="lp-final">
        <h2>Try your idea <em>on the canvas.</em></h2>
        <Link href="/app" className="lp-btn">{CTA}<ArrowRight size={18} aria-hidden /></Link>
        <p className="lp-micro">The Starter plan is open to everyone. A Pro plan is planned.</p>
      </section>

      <footer className="lp-footer">
        <span className="lp-logo"><Logo size={22} />{APP_NAME}</span>
        <span>© 2026 {APP_NAME}</span>
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/app">{CTA}</Link>
      </footer>
    </div>
  );
}
