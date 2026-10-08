import type { Plan } from "./types";
import { slug } from "./offerings";

const FETCHED = "2026-10-08";
const HOSTINGER = "https://www.hostinger.com/vps-hosting";
const DO = "https://www.digitalocean.com/pricing/droplets";
const AKAMAI = "https://www.akamai.com/cloud/pricing";
const ANTHROPIC = "https://platform.claude.com/docs/en/about-claude/pricing";
const GOOGLE_AI = "https://ai.google.dev/gemini-api/docs/pricing";
const OPENAI = "https://developers.openai.com/api/docs/pricing";

const hostinger = (n: number, vcpu: number, ramGb: number, diskGb: number, intro: number, renew: number): Plan => ({
  id: `kvm-${n}`, label: `KVM ${n}`, spec: { vcpu, ramGb, diskGb }, price: renew, priceIntro: intro, source: HOSTINGER, fetchedAt: FETCHED,
  note: `$${intro}/mo is the 24-month intro price; it renews at $${renew}/mo.`,
});
const droplet = (vcpu: number, ramGb: number, diskGb: number, price: number): Plan => ({
  id: `d-${vcpu}-${ramGb}`, label: `Basic ${vcpu} vCPU / ${ramGb < 1 ? "512 MB" : `${ramGb} GB`}`, spec: { vcpu, ramGb, diskGb }, price, source: DO, fetchedAt: FETCHED,
});
const linode = (label: string, vcpu: number, ramGb: number, diskGb: number, price: number): Plan => ({
  id: slug(label), label, spec: { vcpu, ramGb, diskGb }, price, source: AKAMAI, fetchedAt: FETCHED,
  note: "Akamai says prices vary by region; this is the default shown on their page.",
});
const model = (id: string, label: string, inPerM: number, outPerM: number, cachedPerM: number | undefined, source: string, note?: string): Plan => ({
  id, label, tokens: { inPerM, outPerM, cachedPerM }, source, fetchedAt: FETCHED, note,
});

/**
 * Tiers with real numbers, each carrying its source URL and fetch date. Only providers we have actually
 * fetched are listed; everything else offers Auto / Custom until Phase 2 ingestion loads it
 * (Vultr and Hetzner are next: the first fetch failed / returned a partial page).
 */
export const PLANS: Record<string, Plan[]> = {
  "vps:hostinger:kvm-vps": [hostinger(1, 1, 4, 50, 6.49, 11.99), hostinger(2, 2, 8, 100, 8.99, 14.99), hostinger(4, 4, 16, 200, 12.99, 28.99), hostinger(8, 8, 32, 400, 25.99, 49.99)],
  "vps:digitalocean:droplets": [droplet(1, 0.5, 10, 4), droplet(1, 1, 25, 6), droplet(1, 2, 50, 12), droplet(2, 2, 60, 18), droplet(2, 4, 80, 24), droplet(4, 8, 160, 48), droplet(8, 16, 320, 96)],
  "vps:akamai-linode:shared-cpu": [linode("Nanode 1 GB", 1, 1, 25, 5), linode("Linode 2 GB", 1, 2, 50, 10), linode("Linode 4 GB", 2, 4, 80, 20), linode("Linode 8 GB", 4, 8, 160, 40), linode("Linode 16 GB", 6, 16, 320, 80)],
  "llm:anthropic:claude-api": [
    model("haiku-5-5", "Claude Haiku 5.5", 0.1, 0.5, 0.01, ANTHROPIC), model("sonnet-5-5", "Claude Sonnet 5.5", 2, 10, 0.1, ANTHROPIC),
    model("opus-5-5", "Claude Opus 5.5", 4, 20, 0.2, ANTHROPIC), model("opus-5", "Claude Opus 5", 5, 25, 0.5, ANTHROPIC),
    model("fable-5-1", "Claude Fable 5.1", 10, 50, 0.25, ANTHROPIC), model("mythos-5-1", "Claude Mythos 5.1", 10, 50, 0.25, ANTHROPIC),
  ],
  "llm:google:gemini-api": [
    model("gemini-3-8-flash", "Gemini 3.8 Flash", 0.75, 3.75, 0.075, GOOGLE_AI, "Gemini 3.7 Flash and 3.6 Flash are priced the same. Prices listed as valid through 31 Dec 2026."),
    model("gemini-3-5-flash", "Gemini 3.5 Flash", 1.5, 9, 0.15, GOOGLE_AI, "Prices listed as valid through 31 Dec 2026."),
  ],
  "llm:openai:api": [
    model("gpt-6-luna", "gpt-6-luna", 0.1, 0.5, 0.01, OPENAI), model("gpt-6-1-sol", "gpt-6.1-sol", 2, 10, 0.1, OPENAI),
    model("gpt-5-6-sol", "gpt-5.6-sol", 4, 20, 0.4, OPENAI), model("gpt-6-astra", "gpt-6-astra", 10, 50, 1, OPENAI),
    model("gpt-5-6-cyber", "gpt-5.6-cyber", 12.5, 75, 1.25, OPENAI),
  ],
};

export const CUSTOM_PLAN_ID = "custom";
/** Pick the cheapest tier that fits the workload, recomputed whenever the numbers change. */
export const AUTO_PLAN_ID = "auto";
export const plansOf = (offeringId: string): Plan[] => PLANS[offeringId] ?? [];
