import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HeroDecor } from "@/components/landing/HeroDecor";
import { IconRail } from "@/components/landing/IconRail";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/studio/ThemeToggle";
import { APP_NAME } from "@/lib/brand";
import { COUNTS } from "@/lib/catalog";
import "./landing.css";

export const metadata: Metadata = {
  title: `${APP_NAME}: draw a system, see what it costs`,
  description: "Drag services onto a canvas, set the traffic, and see where the design breaks and what each choice costs.",
};

const CTA = "Open the canvas";

const SOURCES = [
  { host: "Hostinger", live: "KVM 1, 2, 4 and 8", url: "https://www.hostinger.com/vps-hosting", label: "hostinger.com/vps-hosting", note: "Intro and renewal prices both stored. Estimates use the renewal price." },
  { host: "DigitalOcean", live: "7 Basic Droplets", url: "https://www.digitalocean.com/pricing/droplets", label: "digitalocean.com/pricing/droplets", note: "" },
  { host: "Akamai (Linode)", live: "5 shared-CPU plans", url: "https://www.akamai.com/cloud/pricing", label: "akamai.com/cloud/pricing", note: "Akamai says prices vary by region; the default is shown." },
];

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
          <a href="#data">Where the data comes from</a>
        </nav>
        <span className="lp-grow" />
        <ThemeToggle />
        <Link href="/login" className="lp-signin">Sign in</Link>
        <Link href="/app" className="lp-navcta">{CTA}</Link>
      </header>

      <section className="lp-hero">
        <HeroDecor />
        <h1>Draw the system.<br /><em>See what it costs.</em></h1>
        <p className="lp-sub">Drag services onto a canvas, set the traffic, and see where it breaks and what each choice costs.</p>
        <div className="lp-actions">
          <Link href="/app" className="lp-btn">{CTA}<ArrowRight size={18} aria-hidden /></Link>
          <a href="#how" className="lp-link">How it works</a>
        </div>
        <p className="lp-micro">Free while we build. Sign in with GitHub or Google.</p>

        <div className="lp-stage">
          <div className="lp-hero-shot"><Shot name="hero" w={2880} h={1960} priority sizes="(max-width: 1100px) 100vw, 1240px" alt="The Sysd canvas: a web system with a CDN, load balancer, function, cache, Postgres and queue, with Postgres highlighted at 82% load and an explanation panel beside it." /></div>
          <div className="lp-float" aria-hidden>
            <Shot name="fit" w={1008} h={624} sizes="420px" alt="" />
          </div>
        </div>
      </section>

      <p className="lp-rail-cap">Compare real options from the providers you already use</p>
      <IconRail />

      <section className="lp-proof" aria-label="What is in the catalog today">
        <div><b>{COUNTS.types}</b><span>services, from Postgres and Kafka to payments and IoT</span></div>
        <div><b>{COUNTS.offerings}</b><span>provider options, from AWS and Neon to a VPS you run yourself</span></div>
        <div><b>3</b><span>hosts with real plan specs and prices, each linked to its source</span></div>
      </section>

      <section className="lp-row">
        <div className="lp-copy">
          <h2>Know if it fits before you pay for it.</h2>
          <p>Drop Postgres, an app server and Redis into a Hostinger KVM 1. Sysd adds up the CPU, RAM and disk each one needs and tells you it does not fit. Pick the next plan and watch it flip.</p>
        </div>
        <div className="lp-media lp-frame"><Shot name="fit" w={1008} h={624} sizes="(max-width: 900px) 100vw, 600px" alt="A server block holding Postgres, an app server and Redis, marked Does not fit, with RAM at 10.2 of 4 GB and disk at 96.2 of 50 GB." /></div>
      </section>

      <section className="lp-row lp-flip">
        <div className="lp-media lp-frame lp-portrait"><Shot name="panel" w={576} h={1206} sizes="(max-width: 900px) 80vw, 340px" alt="Latency, errors and headroom next to a card explaining why Postgres is at 82 percent, then the cost per user per month split into compute, storage, transfer, managed and people." /></div>
        <div className="lp-copy">
          <h2>Cost sits next to latency and errors.</h2>
          <p>Every design gets a unit cost in dollars per user per month, split into compute, storage, transfer, managed and people. The biggest bucket is named, with the usual fix for it.</p>
          <p>When something runs hot, a short note says why. Cost numbers are illustrative until real prices load.</p>
        </div>
      </section>

      <section className="lp-how" id="how">
        <h2>How it works</h2>
        <ol>
          <li><h3>Draw it.</h3><p>Drag from {COUNTS.types} service types and wire them together. Put self-hosted ones inside a server or a Docker container.</p></li>
          <li><h3>Set the traffic.</h3><p>Users, requests per second, peak, data stored and read share. Each component shows how full it gets.</p></li>
          <li><h3>Read the why.</h3><p>Each hot spot explains itself. Swap a server plan and its fit and monthly price update straight away.</p></li>
        </ol>
      </section>

      <section className="lp-data" id="data">
        <h2>Prices carry their source.</h2>
        <p>Each price and plan spec records the page it came from and the date it was fetched. Three hosts are loaded so far. Every other provider lists its name today, and prices follow. Sizing for self-hosted services uses rules of thumb that you can read and challenge, with an error of about 50% either way until each one is tied to a vendor guide.</p>
        <table>
          <thead><tr><th scope="col">Provider</th><th scope="col">Loaded</th><th scope="col">Source</th><th scope="col">Fetched</th></tr></thead>
          <tbody>
            {SOURCES.map((s) => (
              <tr key={s.host}>
                <th scope="row">{s.host}</th>
                <td>{s.live}{s.note && <small>{s.note}</small>}</td>
                <td><a href={s.url} target="_blank" rel="noreferrer">{s.label}</a></td>
                <td>8 Oct 2026</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="lp-final">
        <h2>Try a design <em>on the canvas.</em></h2>
        <Link href="/app" className="lp-btn">{CTA}<ArrowRight size={18} aria-hidden /></Link>
        <p className="lp-micro">Free to use. A Pro plan is planned.</p>
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
