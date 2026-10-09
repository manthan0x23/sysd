import type { SizingProfile } from "./types";

const p = (basis: string, run: SizingProfile["run"]): SizingProfile => ({ basis, run, confidence: "rule-of-thumb" });
const max = Math.max;

/**
 * Self-hosting resource profiles. Every constant here is a rule of thumb and is labelled as such in the UI.
 * Phase 2 ties each one to a vendor sizing guide or benchmark and flips confidence to "sourced".
 * Inputs: rps = requests per second reaching this service, dataGb = data stored.
 */
export const PROFILES: Record<string, SizingProfile> = {
  postgres: p("CPU: 1 core per ~250 queries/s. RAM: 0.5 GB + 10% of data as hot set + 10 MB per connection. Disk: 1.5x data + 5 GB WAL.",
    ({ rps, dataGb }) => ({ cpu: max(0.5, rps / 250), ramGb: 0.5 + max(0.25, 0.1 * dataGb) + max(20, rps / 5) * 0.01, diskGb: 1.5 * dataGb + 5 })),
  mysql: p("CPU: 1 core per ~300 queries/s. RAM: 0.5 GB + 10% of data as buffer pool + 10 MB per connection. Disk: 1.4x data + 5 GB logs.",
    ({ rps, dataGb }) => ({ cpu: max(0.5, rps / 300), ramGb: 0.5 + max(0.25, 0.1 * dataGb) + max(20, rps / 5) * 0.01, diskGb: 1.4 * dataGb + 5 })),
  mongodb: p("CPU: 1 core per ~300 ops/s. RAM: 0.5 GB + 15% of data as working set. Disk: 1.2x data.",
    ({ rps, dataGb }) => ({ cpu: max(0.5, rps / 300), ramGb: 0.5 + max(0.25, 0.15 * dataGb), diskGb: 1.2 * dataGb + 2 })),
  redis: p("Cache holds 5% of data. RAM: 0.1 GB + 1.4x cache size (key overhead). CPU: single-threaded, ~50k ops/s per core. Disk: 2x RAM for snapshots.",
    ({ rps, dataGb }) => { const ram = 0.1 + 1.4 * 0.05 * dataGb; return { cpu: 0.25 + rps / 50000, ramGb: ram, diskGb: 2 * ram }; }),
  memcached: p("Cache holds 5% of data. RAM: 0.1 GB + 1.15x cache size. CPU: ~50k ops/s per core. No disk.",
    ({ rps, dataGb }) => ({ cpu: 0.25 + rps / 50000, ramGb: 0.1 + 1.15 * 0.05 * dataGb, diskGb: 0.5 })),
  pubsub: p("Redis Pub/Sub: messages are not stored, so RAM is small (0.1 GB + 2 MB per msg/s of buffers). CPU: 0.25 core + 1 per 20k deliveries/s (each message goes to every subscriber, about 3). Disk: none.",
    ({ rps }) => ({ cpu: 0.25 + (rps * 3) / 20000, ramGb: 0.1 + rps * 0.002, diskGb: 0.5 })),
  kafka: p("CPU: 1 core + 1 per 4k msgs/s. RAM: 3 GB (heap + page cache) + 2 MB per msg/s. Disk: 1 KB messages kept 3 days.",
    ({ rps }) => ({ cpu: 1 + rps / 4000, ramGb: 3 + rps * 0.002, diskGb: max(5, rps * 0.0864 * 3) })),
  rabbitmq: p("CPU: 0.5 core + 1 per 3k msgs/s. RAM: 0.5 GB + 0.5 MB per msg/s. Disk: 2 GB.",
    ({ rps }) => ({ cpu: 0.5 + rps / 3000, ramGb: 0.5 + rps * 0.0005, diskGb: 2 })),
  elasticsearch: p("Disk: 1.5x data (replicas and index overhead). RAM: about 1 GB per 30 GB of disk, minimum 2 GB. CPU: 1 core + 1 per 200 queries/s.",
    ({ rps, dataGb }) => { const disk = 1.5 * dataGb + 5; return { cpu: 1 + rps / 200, ramGb: max(2, disk / 30), diskGb: disk }; }),
  clickhouse: p("Disk: 0.35x data (about 3x compression). RAM: minimum 4 GB or 3% of data. CPU: 2 cores + 1 per 50 queries/s.",
    ({ rps, dataGb }) => ({ cpu: 2 + rps / 50, ramGb: max(4, 0.03 * dataGb), diskGb: 0.35 * dataGb + 5 })),
  minio: p("Disk: 1x data (no replication on a single node). RAM: 1 GB. CPU: 0.5 core + 1 per 500 requests/s.",
    ({ rps, dataGb }) => ({ cpu: 0.5 + rps / 500, ramGb: 1, diskGb: dataGb + 2 })),
  qdrant: p("Vectors held in RAM: 1.3x data. Disk: 1.5x data. CPU: 1 core + 1 per 200 queries/s.",
    ({ rps, dataGb }) => ({ cpu: 1 + rps / 200, ramGb: 0.5 + 1.3 * dataGb, diskGb: 1.5 * dataGb + 2 })),
  proxy: p("Reverse proxy. CPU: 0.1 core + 1 per 8k requests/s. RAM: 0.1 GB. Disk: 0.1 GB.",
    ({ rps }) => ({ cpu: 0.1 + rps / 8000, ramGb: 0.1, diskGb: 0.1 })),
  app: p("CPU: 0.25 core + 1 per 150 requests/s. RAM: 0.5 GB + 4 MB per request/s. Disk: 1 GB.",
    ({ rps }) => ({ cpu: 0.25 + rps / 150, ramGb: 0.5 + rps * 0.004, diskGb: 1 })),
  worker: p("CPU: 0.5 core + 1 per 30 jobs/s. RAM: 0.5 GB + 10 MB per job/s. Disk: 1 GB.",
    ({ rps }) => ({ cpu: 0.5 + rps / 30, ramGb: 0.5 + rps * 0.01, diskGb: 1 })),
  logs: p("Loki-style: RAM 0.5 GB + 1 MB per log line/s. Disk: 0.5 KB per request kept 14 days.",
    ({ rps }) => ({ cpu: 0.25 + rps / 2000, ramGb: 0.5 + rps * 0.001, diskGb: max(2, rps * 0.0864 * 0.5 * 14) })),
  metrics: p("Prometheus-style: RAM 0.5 GB + 0.5 MB per request/s, CPU 0.25 core, disk 5 GB + 2 GB per 1k requests/s.",
    ({ rps }) => ({ cpu: 0.25 + rps / 4000, ramGb: 0.5 + rps * 0.0005, diskGb: 5 + rps * 0.002 })),
  auth: p("Keycloak-style identity server: RAM 1 GB + 1 MB per login/s, CPU 0.5 core + 1 per 50 logins/s, disk 2 GB.",
    ({ rps }) => ({ cpu: 0.5 + rps / 50, ramGb: 1 + rps * 0.001, diskGb: 2 })),
  workflow: p("Airflow-style scheduler and workers: RAM 2 GB, CPU 1 core, disk 5 GB.",
    () => ({ cpu: 1, ramGb: 2, diskGb: 5 })),
};

/**
 * How much a language runtime needs compared with Node.js for the same traffic. Rule of thumb only: real cost per request
 * depends far more on the work each request does than on the language.
 */
const RUNTIME_FACTOR: Record<string, { cpu: number; ram: number }> = {
  "Node.js": { cpu: 1, ram: 1 }, Bun: { cpu: 0.8, ram: 0.9 }, Deno: { cpu: 0.9, ram: 1 },
  Go: { cpu: 0.25, ram: 0.3 }, Rust: { cpu: 0.2, ram: 0.15 },
  Python: { cpu: 1.9, ram: 1.5 }, Java: { cpu: 0.6, ram: 2.2 }, ".NET": { cpu: 0.5, ram: 1.2 },
  PHP: { cpu: 1.5, ram: 1.2 }, "Ruby on Rails": { cpu: 3, ram: 2 },
};

/** The sizing profile for a self-hosted service, adjusted for the chosen language runtime where there is one. */
export function profileFor(base: SizingProfile | undefined, product: string | undefined): SizingProfile | undefined {
  const f = product ? RUNTIME_FACTOR[product] : undefined;
  if (!base || !f) return base;
  return {
    basis: `${base.basis} Scaled for ${product}: ${f.cpu}x the CPU and ${f.ram}x the RAM of Node.js.`,
    confidence: base.confidence,
    run: (i) => { const r = base.run(i); return { ...r, cpu: Math.max(0.1, r.cpu * f.cpu), ramGb: Math.max(0.1, r.ramGb * f.ram) }; },
  };
}
