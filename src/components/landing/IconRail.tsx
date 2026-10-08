import { BrandIcon } from "@/components/studio/BrandIcon";

const ITEMS: [string, string][] = [
  ["logos:aws", "AWS"], ["logos:google-cloud", "Google Cloud"], ["logos:microsoft-azure", "Azure"], ["logos:cloudflare-icon", "Cloudflare"],
  ["logos:neon-icon", "Neon"], ["logos:supabase-icon", "Supabase"], ["simple-icons:hostinger", "Hostinger"], ["simple-icons:hetzner", "Hetzner"],
  ["simple-icons:digitalocean", "DigitalOcean"], ["logos:vercel-icon", "Vercel"], ["logos:mongodb-icon", "MongoDB"], ["logos:redis", "Redis"],
  ["logos:kafka-icon", "Kafka"], ["logos:stripe", "Stripe"], ["simple-icons:razorpay", "Razorpay"], ["logos:openai-icon", "OpenAI"],
  ["logos:anthropic-icon", "Anthropic"], ["logos:datadog", "Datadog"], ["logos:grafana", "Grafana"], ["logos:docker-icon", "Docker"],
  ["logos:snowflake-icon", "Snowflake"], ["logos:databricks-icon", "Databricks"], ["logos:github-icon", "GitHub"], ["simple-icons:backblaze", "Backblaze"],
];

/** A slow, endless rail of the providers in the catalog. The second copy is only there to make the loop seamless. */
export function IconRail() {
  const set = (hidden: boolean) => (
    <ul className="rail-set" aria-hidden={hidden || undefined}>
      {ITEMS.map(([id, name]) => <li key={name}><span className="rail-chip"><BrandIcon id={id} size={22} /></span>{name}</li>)}
    </ul>
  );
  return (
    <div className="rail" role="group" aria-label="Some of the providers in the catalog">
      <div className="rail-track">{set(false)}{set(true)}</div>
    </div>
  );
}
