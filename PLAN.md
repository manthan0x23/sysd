# Sysd: next work plan

Written 2026-10-09. Planning only, nothing here is built yet. Read `CONTEXT.md` first for the code map.

Three workstreams, in the suggested order: (A) smart connections, (B) replicas, (C) real prices and tiers. A and B change the canvas model and should land before C feeds it real numbers.

---

## A. Intelligent connections

### Problem
Any node can be linked to any node. A cache wired to a CDN, or a database calling a load balancer, is accepted and simulated as if it made sense. The canvas should teach the right shapes, so invalid links should be refused and valid links should carry meaning.

### Idea: every link has a *role*
Today an edge is only "A sends traffic to B, with a share". Make the edge type explicit, derived from the pair (source type, target type):

| Pair (source to target) | Role | What the simulator does |
|---|---|---|
| client / CDN / LB to service | request | passes load on, split by share |
| service to cache | read-through | cache absorbs `hitRate` of reads, only misses continue to the next link |
| service to database | query | reads and writes land on the DB; read share decides read vs write load |
| service to queue | enqueue | async: load is buffered, consumers drain at their own rate |
| queue to worker | consume | worker load = drain rate, not request rate |
| service to object storage | blob I/O | counts requests, GB stored, egress |
| CDN to object storage / origin | origin fetch | only the miss share (the 5% in the sample) reaches the origin |
| database to replica | replication | write-amplified; replica serves reads |

### Work
1. **Connection rule table** in `src/lib/catalog/` (new `connections.ts`): for each service *kind* (not each of the 76 types), the allowed targets and the resulting role. Group the 76 types into ~10 kinds first (client, edge/CDN, balancer, compute, cache, database, queue, storage, search, external).
2. **Validate on connect** in `Canvas` (React Flow `isValidConnection`). Invalid drops are refused with a one-line reason ("A cache can't send traffic to a CDN").
3. **Direction rules**: some pairs are only valid one way (service to cache, never cache to service).
4. **Intelligent behaviour per kind** in `sim.ts` / `analysis.ts`:
   - **Cache**: has `hitRate` (default by type, editable). Only misses continue downstream. Writes may bypass or invalidate. Show hit/miss split on the link.
   - **CDN**: hit rate replaces the hand-set 5% share on the CDN to storage link (the known gap in `CONTEXT.md`: "no automatic CDN cache-hit model").
   - **Database**: read/write split from the workload's read share; a read replica takes reads; connection limits flagged.
   - **Queue**: decouples producer and consumer; show backlog growth if consumers are slower than producers.
   - **Storage**: stored GB, request count, egress; cost already modelled but tied to link role.
5. **Link labels** show the role and the traffic (for example "reads 4,200/s, 85% hit").
6. **Migration**: existing saved designs may contain now-invalid edges. Keep them loadable, mark them with a warning badge, never silently delete.
7. Tests: a table-driven test over (kind, kind) pairs; simulator tests for cache hit split, queue backlog and replica read routing.

Open decision: strict (refuse) vs soft (allow but warn). Suggested: refuse the clearly nonsensical, warn on the unusual.

Estimate: about 2 to 3 focused days for the rules and the cache/DB/CDN/queue behaviour.

---

## B. Replicas and autoscaling

### Problem
No way to say "3 workers" or "2 to 10 replicas, autoscaled". One node equals one instance.

### Work
1. **Node fields**: `replicas` (fixed count) and optional `autoscale { min, max, targetUtilisation }`.
2. **Simulator**: load per instance = node load / replicas. Capacity and latency use per-instance load; fit meters show per instance.
3. **Autoscale model**: replicas needed = ceil(peakLoad / (capacityPerInstance x target)), clamped to min/max. Cost uses average replicas (between baseline and peak load, a stated assumption) and shows min / avg / max.
4. **Cost**: instance price x replicas. Managed services (RDS-style) price replicas differently from compute, so this is per offering.
5. **UI**: a replicas stepper and an autoscale toggle in the node panel; a badge on the node ("x3" or "2-10"). Optionally a visual stack effect on the card.
6. **Load balancer coupling**: a balancer in front of a replicated service should show an even split; a replicated service with no balancer gets a warning.
7. **Exports and doc format**: add the fields to `doc.ts` (design to JSON), the zod schema in `server/doc.ts`, the XLSX/CSV breakdown rows, and a migration default of `replicas = 1` for old designs.
8. Tests: replica division, autoscale clamping, cost x replicas, round-trip save/load.

Estimate: about 1 to 2 days.

---

## C. Real prices, plans and tiers (Phase 2)

### Goal
One place that holds every provider's prices and tier specs, each with source URL and fetch date, human-approved before it goes live.

### Data model
- `providers`: id, name, kind, pricing page URL.
- `offerings`: provider + service kind (for example "DigitalOcean / Droplet", "Neon / Postgres").
- `tiers` (the plan table): offering, tier name, **vCPU, RAM, storage, bandwidth, connection limits, IOPS** (whatever applies, as typed spec fields), price, unit (hour / month / GB / million requests), currency, region.
- `price_points`: raw payload, source URL, fetched_at, status `pending / approved / rejected`, reviewer, approved_at.
- Usage-based prices (per GB, per million requests, per GB-hour) are a `unit` on a tier or a separate rate table, not a fake monthly number.

### Pipeline
1. Ingestion script per provider (`scripts/prices/<provider>.mjs`) writes `pending` rows with the raw payload.
2. Review step (a CLI diff view: old vs new, flagged big changes) approves or rejects.
3. Publish an **approved snapshot** (static JSON) that the client-side cost engine loads, because the engine runs in the browser. Version the snapshot.
4. Scheduled re-check (monthly) that flags price drift rather than auto-publishing.

### Sources: to verify before relying on them
- Likely APIs: Azure Retail Prices API, AWS Price List files, GCP Billing Catalog (needs a key), Linode and Vultr public plan endpoints, Hetzner (needs a token).
- Likely scrapes (Firecrawl): Hostinger, Cloudflare, Vercel, Neon, Supabase, and LLM price pages.
- Do not trust any of the above until checked; record what each source actually returned and when.

### Rules
- Anything not backed by an approved price point stays labelled **Illustrative**; only approved ones may show **Real price**.
- The existing 3 hosts and S3/R2/B2/Wasabi data in `pricing/data.ts` and `catalog/plans.ts` migrate into the same tables.
- Sizing profiles (`catalog/sizing.ts`) stay rule-of-thumb until a tier's real specs can drive capacity (see below).

### Capacity from real tiers
Once tiers carry vCPU/RAM, derive node capacity from the chosen tier by inverting the sizing profile, instead of the current per-type illustrative capacity. This is the known gap in `CONTEXT.md` and is what makes A and B's numbers meaningful.

### Excel file (for the owner only)
- The **database is the source of truth** and is what the app queries (tiers by provider, kind, vCPU/RAM, price, region, status).
- A script (`npm run prices:xlsx`, using the already-installed `exceljs`) dumps the DB to `prices.xlsx`: one sheet per service kind (Compute, Databases, Cache, Storage, ...), plus a `pending` sheet for rows awaiting review and a `sources` sheet (URL, fetched_at). Columns: provider, product, tier, vCPU, RAM, storage, bandwidth, price, unit, currency, region, status, source URL, fetched_at.
- It is **read-only output**: for browsing, sorting and comparing. It is not shipped, not served, and gitignored.
- Optional later: `prices:import` to read approvals/edits back from the sheet (match on row id, write a new `pending` row, never overwrite approved data). Skipped unless the review step proves painful in the CLI.


### Status (2026-10-09): first scrape done, nothing live
Pipeline lives in `scripts/prices/` (`npm run prices:status | prices:fetch | prices:api | prices:validate | prices:coverage | prices:xlsx`). Output in `data/prices/` (raw pages and API dumps are gitignored; `extracted/` is reviewable).
- **Captured:** 251 provider files, about 4,300 hand-extracted tiers, plus 32,691 rate rows from the AWS, Azure, Oracle and Scaleway price APIs, and full tier lists from Linode, Vultr, Google Compute Engine and Hetzner.
- **Coverage:** 440 of 568 catalog offerings have at least one captured price (`npm run prices:coverage`). The rest are listed in the `Gaps` sheet of `prices.xlsx`, each with a reason in that provider's `notes`.
- **DB schema + import (done 2026-10-09, local DB only):** migration `drizzle/0004` adds `price_sources`, `price_tiers`, `price_rates`, `price_snapshots` and enums `price_status` (pending/approved/rejected/superseded), `price_source_kind`. `npm run prices:import` (`scripts/prices/import.mts`; flags `--dry`, `--replace`) loaded 357 sources, 4,539 tiers (4,261 scraped + 278 from API) and 32,691 rates, all `pending`. Re-running skips sources already imported. Tiers have a stable `key` (provider|offerings|tier|region) so a newer fetch can supersede an approved row. Rates are approved per source, not per row. **Neon (production) is NOT migrated and has no price data.**
- **Not done:** review/approve step, snapshot JSON for the cost engine, capacity-from-tiers. The app reads none of this yet. Everything is status `pending` (not human-checked).
- **Found while doing it:** Linode prices in `catalog/plans.ts` are stale ($12/$24/$48/$96 live vs $10/$20/$40/$80), and Hetzner raised prices on 15 June 2026 (for example CPX22 now $22.99 vs $9.49 before).

### Order inside C
1. Schema and snapshot loader (migrate existing 3 hosts and storage first, to prove the shape).
2. One easy API provider end to end (Linode or Vultr).
3. Scrape-based providers with review.
4. Capacity from tiers.
5. Drift monitor.

Estimate: about 1 to 2 weeks for a trustworthy first slice (schema plus 4 to 5 providers); the long tail is ongoing.

---

## D. Missing system-design concepts (catalog gap)

Checked `src/lib/catalog/services.ts` on 2026-10-09: 76 types exist (worker, queue, lb, cdn, redis, kafka, and so on). What is missing is not services but the *patterns* that make a design a design. Most should be **properties on existing nodes**, not new palette items.

**Properties on a node (cheap, high value)**
- Replicas / autoscaling (workstream B).
- Database: primary + read replicas, multi-AZ standby, sharding (shard count + shard key), connection pool size.
- Cache: hit rate, TTL, eviction policy, pattern (cache-aside / write-through / write-back).
- Queue: consumer count, retry policy, dead-letter queue, ordering (FIFO or not), visibility timeout.
- Worker: concurrency per instance, job duration (so throughput = concurrency / duration).
- Load balancer: algorithm (round-robin / least-connections / hash), health checks.
- Region / availability zone, so cross-region latency and egress cost can show up.

**Link properties**
- Sync vs async, protocol (HTTP / gRPC / WebSocket), timeout, retry, share (already exists).

**New palette items worth adding**
- Read replica (as its own node tied to a primary, so replication is visible).
- Rate limiter, circuit breaker, service mesh / sidecar.
- Consistent-hashing ring or shard router.
- Scheduler / leader election (ZooKeeper / etcd), service discovery.
- Dead-letter queue, outbox.
- Multi-region / failover pair, regional group box (like the Server and Docker host blocks).

**Behaviour the simulator should show**
- Failure: kill a node or zone and see what breaks (single point of failure highlight).
- Backpressure: queue backlog, retry storms, cache stampede.
- Bottleneck ranking: which node saturates first.

Order: replicas and per-kind properties first (they ride on A and B), new palette items after.

---

## Suggested order

1. B (replicas): smallest, self-contained, immediately visible.
2. A (connection rules and cache/DB/queue behaviour).
3. C step 1 and 2 (schema, first API provider), then the rest.

Then Phase 3 (AI architect agent) benefits from all of the above: it needs valid connection rules and real tiers to give trustworthy designs.

## Still open from `CONTEXT.md`
Final Pro price, wedge (indie cost planning vs interview practice), willingness-to-pay evidence, apex vs www, Safe Browsing review, live Dodo setup and a real webhook test.
