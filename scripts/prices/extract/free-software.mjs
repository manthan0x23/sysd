// Open-source software with no licence fee: the cost is the server it runs on. Plus items re-used from earlier verified scrapes.
import { write, plan } from "./lib.mjs";

const FREE = [["nginx", "proxy:nginx:self-hosted", "nginx"], ["caddy", "proxy:caddy:self-hosted", "Caddy"], ["traefik", "proxy:traefik:self-hosted", "Traefik"], ["haproxy", "proxy:haproxy:self-hosted", "HAProxy"],
  ["jenkins", "ci:jenkins:self-hosted", "Jenkins"], ["keycloak", "auth:keycloak:self-hosted", "Keycloak"], ["debezium", "cdc:debezium:self-hosted", "Debezium"], ["jaeger", "tracing:jaeger:self-hosted", "Jaeger"],
  ["litestream", "sqlite:litestream:self-hosted", "Litestream"], ["pocketbase", "baas:pocketbase:self-hosted", "PocketBase"], ["rabbitmq", "queue:rabbitmq:self-hosted", "RabbitMQ"], ["uptime-kuma", "uptime:uptime-kuma:self-hosted", "Uptime Kuma"]];
const SRC = { nginx: "https://nginx.org/", caddy: "https://caddyserver.com/", traefik: "https://traefik.io/traefik/", haproxy: "https://www.haproxy.org/", jenkins: "https://www.jenkins.io/", keycloak: "https://www.keycloak.org/", debezium: "https://debezium.io/", jaeger: "https://www.jaegertracing.io/", litestream: "https://litestream.io/", pocketbase: "https://pocketbase.io/", rabbitmq: "https://www.rabbitmq.com/", "uptime-kuma": "https://github.com/louislam/uptime-kuma" };
for (const [prov, id, label] of FREE) write(prov, [plan(id, `${label} (open source)`, 0, "month", { note: "No licence fee; you pay for the server it runs on." })], { sources: [SRC[prov]] });

// Cloudflare R2: scraped 2026-10-08 (see src/lib/pricing/data.ts), https://developers.cloudflare.com/r2/pricing/
write("cloudflare-r2", [plan("object:cloudflare:r2", "R2 Standard", null, "gb-month", { rates: [["storage", 0.015, "gb-month"], ["class A operations (per 1k)", 0.0045, "1k-requests"], ["class B operations (per 1k)", 0.00036, "1k-requests"], ["egress", 0, "gb"]], spec: { freeStorageGb: 10, freeClassA1k: 1000, freeClassB1k: 10000 }, note: "Carried over from the app's existing scraped data (2026-10-08); not re-fetched in this run." })], { sources: ["https://developers.cloudflare.com/r2/pricing/"], fetchedAt: "2026-10-08" });
write("docker-container", [plan("container:docker:container-on-your-server", "Docker Engine (open source)", 0, "month", { note: "No licence fee; runs on your server." })], { sources: ["https://www.docker.com/pricing/"] });
