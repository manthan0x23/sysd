# Sysd: handoff context

Read this first, then `AGENTS.md` (Next.js 16 differs from older versions: read `node_modules/next/dist/docs/` before writing framework code). Last updated 2026-10-09.

## What this is

**Sysd** (sysd.live) is a sign-in-required web app. People draw a software system on a canvas (drag services, nest them in servers or Docker blocks), set traffic (users, req/s, peak, data, read share), and see what it costs and where it breaks. About 70% learning (visual "why" explanations), 30% cost estimation for real work.

Owner: Manthan (solo, Indian, working a full-time job). Goal: find a product to own and get real users on. **Honest state: a good learning tool, not yet a trustworthy decision tool.** Only 3 hosts have real prices; everything else is illustrative; capacity numbers are rule-of-thumb (±50%). Sellability is unproven. See "Open questions".

## Working with the owner

- Short, scoped answers. They get overwhelmed by long forward-looking ones.
- Honest, not a cheerleader. Verify before claiming (dates, prices, links) and show evidence. Say when you could not verify.
- They often reply with screenshots and typos; reply directly.
- They run a `/caveman` terse-reply mode in this project. Code, commits and docs are written normally.
- Never print secret values. Real secrets live only in `.env.local` (gitignored). An `AUTH_SECRET` once leaked into chat output, so production uses a fresh one.
- Ask before pushing. Push only when they say "push". Migrate Neon (production DB) before pushing code that needs a migration.
- Commit trailer used in this repo: `Co-Authored-By: Claude ... <noreply@anthropic.com>` and a `Claude-Session:` line.

## Stack

Next.js 16 (App Router, **Cache Components**, Turbopack), React 19, TypeScript, @xyflow/react v12 (canvas), zustand (client store), Auth.js v5 beta (GitHub + Google only, JWT sessions), Drizzle ORM + postgres.js, zod, exceljs, Dodo Payments (`@dodopayments/nextjs`, `dodopayments`), `@vercel/analytics`. Hosting: Vercel, functions pinned to Mumbai (`vercel.json`: `bom1`). DB: Neon (production, **Singapore** `ap-southeast-1`), Docker Postgres locally.

### Next.js 16 gotchas hit in this repo

- Pages that read the session need `await connection()` inside a `<Suspense>` boundary (see `src/app/(account)/home/page.tsx`).
- `export const runtime` is rejected with Cache Components. Remove it.
- `"use server"` files may export only async functions (helpers like `safeNext` live in `src/lib/`).
- `usePathname()` in a layout must sit in `<Suspense>` (see `NavLinks.tsx`) or prerender fails.
- The production build **must work with no env vars** (Vercel builds without secrets): `src/db/index.ts` is a lazy proxy, and the Dodo webhook route builds its handler per request.
- Radix-free: React Flow CSS is imported in `src/app/layout.tsx` before `globals.css`.

## Run it

```
npm i
npm run db:up        # Docker Postgres (needs .env.local with POSTGRES_PASSWORD, DATABASE_URL)
npm run db:migrate   # applies ./drizzle to DATABASE_URL (safe to repeat)
npm run dev          # http://localhost:3123 (dev server was run with -p 3123)
npm run test:db      # 47 access-rule checks against local Postgres
npm run test:billing # plan-sync from Dodo subscription states
npm run plan -- email pro   # grant or revoke Pro by hand
env -u DATABASE_URL npx next build   # confirm the no-env build still works
```

`.env.example` lists every variable name. Needed: `AUTH_SECRET`, `AUTH_GITHUB_ID/SECRET`, `AUTH_GOOGLE_ID/SECRET`, `DATABASE_URL`, `DODO_PAYMENTS_API_KEY`, `DODO_PAYMENTS_WEBHOOK_KEY`, `DODO_PAYMENTS_ENVIRONMENT` (`test_mode` now), `DODO_PRODUCT_PRO_MONTH/YEAR` and `_INR` variants, optional `NEXT_PUBLIC_CONTACT_EMAIL`. Production DB URL is a commented `DATABASE_URL` line in `.env.local`; to migrate production run `DATABASE_URL=<neon url> node scripts/migrate.mjs`.

## Code map

- `src/app/` pages: `page.tsx` landing; `login`; `app` (canvas, `app/d/[id]` saved design); `s/[token]` read-only share; `(account)/` home, teams, designs, invite, welcome, upgrade (shared header + ambient backdrop); `terms`, `privacy`; `api/auth`, `api/export`, `api/billing/{checkout,portal}`, `api/webhook/dodo`.
- `src/components/studio/` canvas UI: `Studio`, `Canvas`, `NodeCard`, `HostNode`, `Palette`, `TopIsland` (centred, expands both ways, avatar menu), `UtilityIsland` (bottom: save, zoom, breakdown, export, theme, Go Pro), `BreakdownDock` (full-screen toggle, XLSX), `panel/*` (Numbers, inputs, load, cost, fit).
- `src/store/useStudio.ts` zustand store (nodes, edges, workload, design state, undo, UI fold state). The sample system and its edges are here (`INITIAL_NODES/EDGES`; the CDN→Storage link has a 5% share so the sample cost is realistic).
- `src/lib/`: `sim.ts` (traffic simulation, `splitFor`), `analysis.ts` (two-pass: loads → plans/prices → cost), `fit.ts` (host fit meters), `breakdown.ts` (rows shared by exports), `doc.ts` (design ⇄ JSON), `catalog/` (76 service types, ~600 provider offerings, plans, sizing profiles, icons), `pricing/` (`data.ts` real prices with source+date, `estimate.ts`, `rank.ts`, `plans.ts` **Pro prices**, `features.ts` **plan comparison rows**), `brand.ts` (`APP_NAME`, `PLAN_LABEL`: free plan is shown as **Starter**), `profile.ts` (welcome answers).
- `src/server/`: `access.ts` (all authorisation), `designs/shares/teams.ts`, `plans.ts` (`requireFeature`, `FEATURES`), `billing.ts` (Dodo checkout, portal, `applySubscription`), `exports.ts` + `api/export` (Pro-only, server enforced), `profile.ts`, `doc.ts` (zod validation, `UserError`).
- `src/db/schema.ts`; migrations `drizzle/0000–0007` (0001 thumbnails, 0002 profile, 0003 Dodo ids, 0004 price tables, 0005 `users.avatar`, 0006 **drops `users.image`**, 0007 `teams.logo`). Neon is migrated through 0003 only. **Do not run 0006 on Neon until the new code is deployed** (live code still reads `users.image`).
- `public/shots/{hero,fit,panel}-{light,dark}.png` landing screenshots, all regenerated from the current UI on 2026-10-09 (regenerate whenever the UI changes: sign a session cookie for a throwaway Pro user, open `/app`, capture with Chrome DevTools Protocol at 2x). Brand logos are bundled via `scripts/build-brand-icons.mjs` from `src/lib/catalog/iconMap.ts`.

## Avatars, logos and uploads (2026-10-09)

The sign-in provider photo is no longer stored. `src/lib/avatar.ts` defines an avatar as a string: `l:<letter>:<colour>`, `b:<bundled logo id>`, `p:<0-11>` (drawn person), `u:<R2 key>` (upload). `Avatar` renders it (pastel fills + ink outline, same as the UI), `AvatarPicker` is the dialog (tabs Letters / Logos / People / Upload), used for your own avatar (`TopIsland` menu, account header) and team logos (`TeamLogo`, owner only). Uploads: browser shrinks to 256 px, asks `requestUploadAction` for a presigned R2 PUT (`src/server/uploads.ts`: type png/jpg/webp, <=256 KB, size signed, key `avatars/<user>/…` or `teams/<team>/…`), PUTs straight to R2, then Save verifies the object (HEAD) and deletes the previous upload. **Needs env** `R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, NEXT_PUBLIC_R2_PUBLIC_URL` and an R2 bucket with a public domain and CORS allowing PUT + `Content-Type` from the site origins. Without them the Upload tab is hidden. Bucket `sysd-images` serves publicly at `https://r2.sysd.live` (zone sysd.live moved to Cloudflare 2026-10-09). Tested end to end locally: presigned PUT, HEAD verify, public read, oversize and wrong-type refused (403). Production still needs the five R2 vars in Vercel; CORS already lists sysd.live. The key is an account API token scoped to this bucket; its value was pasted in chat once, so roll it in the dashboard if that matters, then update `.env.local` and Vercel. Orphans (uploaded then cancelled) are not cleaned up; add an R2 lifecycle rule or a sweep.

## Canvas intelligence (2026-10-09)

- **Link rules** `src/lib/catalog/connections.ts`: 76 types fall into 10 kinds; a table says which kind may send to which; invalid drops are refused with a reason (toast), duplicates refused, old saved designs keep invalid links but show a red "Not a valid link" badge. Link role (query, enqueue, origin fetch...) shows on a selected link.
- **Copies** (`NodeData.replicas`, `autoscale`): compute can autoscale (aims for 70% busy, min/max), databases/caches/streams take fixed copies (a DB with N = primary + N-1 read replicas: writes stay on primary, reads shared). Not for serverless/SaaS (pay per use), self-hosted, or anything inside a server block. Each copy is billed as a full instance. Badge `×3` or `3×` on the node.
- **Hit rates**: caches (default 80%) and CDNs (95%) have a `hitRate`; the CDN→origin share is `1 - hit` (the sample's hand-set 5% is gone); the cache hit rate decides what reaches the database.
- **Backlog**: a worker fed by a queue that cannot keep up shows `backlog +N/s` and the explanation says so.
- **Link routing** (`src/lib/route.ts`, used by `Canvas` + `FlowEdge`): after nodes settle (140 ms debounce) every link is re-planned as an orthogonal route on the 11px grid (A*, bend penalty, avoids cards and server blocks neither end sits in, fans out parallel links, prefers not to run along a block border). Leaves a handle on the right, enters on the left; back edges loop around outside. React Flow draws handles ~4px outside the node edge, so `plannedPath` snaps the route ends onto them (tolerance 8 px) and falls back to the old smoothstep while a node is being dragged. Layout (`layout.ts`) layers by BFS depth over forward edges so loops (verdicts back to servers) do not push nodes right. `npm run test:route`.
- **Best value button** (piggy bank, bottom toolbar; `components/studio/optimize.ts`): switches every service to the cheapest option with a *sized* real price at its current load (tier set to Auto), skipping models, services with your own cost and anything inside a server block; toast shows before/after and can undo. Tiers whose size cannot be compared with the load (no CPU/RAM figures) are not allowed to win, so the saving is conservative but still rests on rule-of-thumb sizing.
- Format button (`src/lib/layout.ts`): layered left-to-right layout on the 11px grid, hosts grow to fit.
- Tests: `npm run test:smart`, `test:layout`, `test:uploads`. Not yet done from PLAN.md D: sharding, multi-AZ, queue retry/DLQ, worker concurrency, region/AZ, failure simulation. UI changes were typechecked and unit-tested but **not clicked through in a browser**.

## Price pipeline (Phase 2, in progress; details in PLAN.md section C)

`scripts/prices/` + `data/prices/` (untracked, raw/pending gitignored). Run `npm run prices:status` to see what is fetched/extracted, `prices:coverage` for catalog gaps (440/568 covered), `prices:validate` for the extracted files, `prices:import` to load everything into Postgres as `pending`. Tables: `price_sources` (url + fetched_at), `price_tiers` (plans with specs), `price_rates` (bulk API unit prices), `price_snapshots`. **The canvas now reads it (2026-10-09):** `npm run prices:approve` marks rows approved by mechanical checks only (positive amount, known unit, USD, has a source URL; NOT a human review), `npm run prices:snapshot` writes `src/lib/pricing/snapshot.json` (committed; about 200 KB: 2,247 plans over 169 offerings, plus AWS EC2/RDS/ElastiCache instance prices derived from the Price List and thinned to the cheapest per size). `catalog/plans.ts` merges it over the hand-entered plans (snapshot wins, so Linode is now $12/$24/$48/$96). Non-server tiered services default to **Auto**: `pricing/pick.ts` picks the cheapest tier whose CPU/RAM cover the sizing profile's need at 85% headroom (rule-of-thumb, +/-50%); the estimate says so. **Team and operations inputs (2026-10-09):** `Workload` has `seats, ciMinutes, monitors, hosts, ingestGb, events` (defaults in `DEFAULT_OPS`: 3 people, 1,500 CI min, 5 monitors, 3 hosts, 5 GB logs, 100k events; sliders in Inputs; old saves get the defaults; zod fields optional). Free-tier `limits` can use them (`freeFits`), CDN/image egress is derived from rps x 100 KB, and per-user-month tiers (29 plans, e.g. GitHub Team $4) are priced as price x seats (`Plan.perSeat`, snapshot flag `s`). `free-tiers.json` entries may carry `only: [offering ids]` to limit where a limit applies. 25 free plans still have no stated limits (units we cannot map, such as Netlify credits). **Free tiers (2026-10-09):** `$0` tiers are in the snapshot with `free: true`. Limits come from `scripts/prices/free-tiers.json` (hand-read from provider pages, dated; matched to captured tiers, or added when never captured: AWS Lambda/DynamoDB/SQS, Google Cloud Run/Functions/Firestore/BigQuery/e2-micro, Cloudflare Workers/D1/KV/Pages, Firebase Spark, Oracle Always Free). `pricing/pick.ts` `freeFits` picks a free tier only when every limit we know covers the load (storage, requests/month, users, compute-hours, RAM, vCPU) and at least one was compared; free tiers without stated limits are listed but never auto-picked. Scale-to-zero (serverless-model) compute hours assume idle time below ~10 req/s. Unknown saved plan ids now mean Auto. Not covered: usage-priced services (rates only: Neon, Stripe, CloudFront...) stay illustrative; non-USD tiers (Scaleway EUR) are skipped; AWS prices are instance-only (storage/IO extra, noted on each plan). Next: human review pass, Neon migration + snapshot refresh job. Scrape rules: record only what is literally on the page; Firecrawl credits are limited (~315 left).

## Product rules

- Everything requires a profile (GitHub or Google). No email sign-up. Share links also need sign-in. Views are counted (not by whom).
- Plans: **Starter** (db value `free`) and **Pro**. Pro today = exports (XLSX with formulas and an auto share link, CSV, JSON, SVG, PNG, printable report) + teams (viewer/editor, invite links). The **AI agent is Pro-only and not built** (Phase 3).
- Pro price: $9/mo, $79/yr, founding $6/mo for the first 100; INR ₹499/₹3,999, founding ₹349 (`src/lib/pricing/plans.ts`). The owner considered raising to $12 at launch and $19–24 once the agent ships; undecided. Dodo products carry their own prices, so a change means new Dodo products too.
- Costs show a basis per row: Real price / Your figure / Illustrative.

## Billing (Dodo Payments)

- Merchant of record chosen because Stripe is invite-only in India and Razorpay leaves tax/FX to the seller.
- **Test mode** is configured. Four products exist (USD and INR, monthly and yearly). A product has one base currency, hence separate INR products (`productFor` in `billing.ts`).
- Flow: `/upgrade` → `POST /api/billing/checkout` (authenticated, puts `user_id` in metadata) → Dodo checkout → `POST /api/webhook/dodo` (signature checked by the adaptor, returns 401 unsigned) → `applySubscription` sets `plan`/`planExpiresAt` from the subscription's own state (active = Pro until next billing + 3 days; cancelled keeps what was paid for; on_hold/failed/expired = Starter). Idempotent and order-insensitive. `test:billing` covers it.
- **The webhook URL registered in Dodo must be the final host with no redirect.** It was once set to `sysd.live`, which redirects to `www.sysd.live`, so events never arrived; it is now `https://www.sysd.live/api/webhook/dodo`. If the primary domain changes, update it in Dodo (`webhooks.update`).
- Billing is inert (button reads "Pro opens soon") unless the Dodo env vars are all set. Going live needs: Dodo live-mode approval (verification form was in progress), live API key + webhook secret, live products, Vercel env vars, and a real webhook test (cancel a test subscription and watch the DB).
- Dodo's payout fee is described differently in their docs and pricing page; the owner was to confirm with support.

## Domain, hosting and Google (state when this was written)

- DNS is at Hostinger: `A @ 216.198.79.1` (Vercel), `CNAME www → sysd.live`. Vercel serves `www.sysd.live`; the apex 308-redirects to www. The owner was advised to make the apex primary; if so, update OAuth callbacks, `NEXT_PUBLIC_SITE_URL` (not yet used), Dodo webhook, and Search Console.
- OAuth callbacks needed per host: `/api/auth/callback/github` and `/google`. A `redirect_uri_mismatch` happens when the host differs from what is registered.
- Google Search Console: a DNS TXT verification was being set up (record must be Name `@`, value `google-site-verification=…`, copied with the Copy button).
- Google OAuth branding verification was blocked by "domain not registered to you"; retry after Search Console verifies, then wait about 24 hours. Removing the logo avoids the need for verification.
- **Google Safe Browsing flagged the domain as "Deceptive pages"** (no sample URLs; looks like a false positive on a new domain). A review request was recommended. If it is rejected, remove the third-party logo tiles on the landing page (`HeroDecor`, `IconRail`) and resubmit.
- Vercel needs the env vars listed above; Framework Preset must be Next.js.

## Known gaps and traps

- Real prices exist for 3 hosts (Hostinger, DigitalOcean, Akamai/Linode) and S3/R2/B2/Wasabi object storage, all in `src/lib/pricing/data.ts` and `catalog/plans.ts` with source URL and fetch date. Everything else is illustrative.
- Object-storage cost assumes every request reaches the store and objects average 100 KB, so a CDN must be modelled with a link share (the sample does this). The simulator has no automatic CDN cache-hit model.
- Sizing profiles (`catalog/sizing.ts`) are rule-of-thumb; language runtimes (Node, Go, Rust, Python, Java, .NET, PHP, Rails, Bun, Deno) scale CPU/RAM by a factor versus Node (`profileFor`). None are sourced.
- Latency and capacity use a per-type illustrative capacity, not the chosen plan (known gap noted before; deriving capacity from plan/host by inverting sizing profiles was proposed and not done).
- Edge routing is React Flow smoothstep with no overlap avoidance (ELK was planned, `elkjs` is installed but unused).
- The QA harness (headless Chrome over CDP, minting session cookies from `AUTH_SECRET`) lived in a scratch directory and is not in the repo. Rebuilding it is straightforward: sign a JWT cookie with the Auth.js secret for a throwaway user.
- A session cookie whose user id is not a UUID makes pages error (only possible with a forged cookie).

## Roadmap

1. **Phase 1 (done)**: canvas UI, auth, saves, share, teams, exports, Pro gating, landing, legal, pricing page, onboarding (`/welcome`, answers stored in `users.profile`).
2. **Phase 2 (next, owner's direction)**: real prices. Use a provider's live price API where one exists; scrape (Firecrawl) where not; every price keeps source URL + fetch date; human review before it goes live; then populate the production DB. Suggested shape: tables for sources and price points with `pending/approved` status and raw payload, ingestion scripts per provider, an approve step, and the app reading approved data (the cost engine is client-side, so publish an approved snapshot the client can load). Candidate sources to **verify before relying on them**: Azure Retail Prices API, AWS Price List files, GCP Billing Catalog (needs a key), Linode and Vultr public plan endpoints, Hetzner (token), LLM price lists. Hostinger, Cloudflare, Vercel, Neon, Supabase are likely scrapes. Reuse the Infracost Cloud Pricing API idea for AWS/Azure/GCP.
3. **Phase 3**: Pro-only **AI architect agent**. Intended value: the user states their app and expected users and it designs the system, picks services/plans, shows where to cut cost, and can build it on the canvas. Design notes: server route `/api/agent` (auth + Pro check + zod-validated messages, server-owned system prompt and tools), client-side tool executor mutating the zustand store, undo for agent changes, usage caps (per-user daily, global monthly USD), default model `claude-haiku-5-5` via env, welcome-profile answers as context, tests against a mocked API base URL. Follow the `claude-api` skill for current SDK shapes.
4. **SEO** (deferred until the domain settles): `sitemap.ts`, `robots.ts`, `metadataBase` + canonical on one host, Open Graph image, JSON-LD (SoftwareApplication/FAQ), `llms.txt`, noindex on app/login pages, and public example pages (cost of running X for N users) since share links currently need sign-in.
5. Also pending: account self-delete (policy says deletion is by request), a real webhook test, public pricing page for payment reviewers (`/upgrade` needs sign-in), pushing commit `d0ae2d8` (local at the time of writing).

## Open questions for the owner

- Final price and whether Teams are per seat.
- Which wedge: pre-launch cost planning for indie SaaS, or system-design interview practice.
- Evidence of willingness to pay: the plan was 20 hand-picked users designing a real app, then asking who would pay.
- Primary domain: apex or www.

## Marketing notes (judgment, not data)

Target learners first, then indie founders. Hook: "See the bill for your app before you build it." Short screen-recorded demos, public example designs, build in public, one Product Hunt / Show HN launch once the live site is solid. Measure sign-ups, saved designs and shared designs weekly.
