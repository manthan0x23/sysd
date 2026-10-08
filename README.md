# Sysd

Draw a system, set the traffic, and see where it breaks and what each choice costs. Free to use, sign-in with GitHub or Google.

- Next.js 16 (App Router, Cache Components), React Flow canvas, Auth.js (GitHub and Google only)
- Prices and plans come from fetched pages and carry their source URL and fetch date. Anything without real prices is labelled illustrative.

## Run it

```bash
npm install
cp .env.example .env.local   # then fill in the values, see the comments inside
npm run db:up                # local Postgres in Docker (needs POSTGRES_PASSWORD and DATABASE_URL in .env.local)
npm run db:migrate           # create the tables
npm run dev -- -p 3123
```

Put real secrets only in `.env.local` (gitignored), never in `.env.example`.

## Data

Profiles, designs (draft or saved), share links, teams, members and invites live in Postgres (`src/db/schema.ts`, migrations in `drizzle/`). Locally that is the Docker database; in production use a Neon *pooled* connection string. Run `npm run db:migrate` against production with `DATABASE_URL=<neon url> npm run db:migrate`.

- Sign-in is GitHub or Google only; a profile is created on first sign-in. Everything in the app needs a profile, including shared links.
- Free: sketch, estimate, save designs, share read-only links. Pro: teams (viewer and editor roles, invite links) and, later, the AI agent. Grant Pro by hand for now: `npm run plan -- you@example.com pro`.
- `npm run test:db` checks every permission rule against the local database.

Sign-in needs a GitHub OAuth app and a Google OAuth client. The callback URLs are `/api/auth/callback/github` and `/api/auth/callback/google` on whatever host you run.

## Scripts

- `node scripts/build-brand-icons.mjs` bundles the logos listed in `src/lib/catalog/iconMap.ts`.
- `node scripts/build-logo-pngs.mjs` renders the logo PNGs in `public/brand/` (needs Chrome).
- `npm run db:up|db:down|db:generate|db:migrate|db:psql` manage the local database; `npm run plan` grants Pro.

## Where things are

- `src/lib/catalog/` services, providers, plans and sizing rules
- `src/lib/pricing/` real-price data, monthly estimates and ranking
- `src/lib/sim.ts`, `fit.ts`, `analysis.ts` the traffic, fit and cost model
- `src/components/studio/` the canvas, panels and pickers
- `src/server/` access rules, designs, shares, teams and plans (all permission checks live here)
- `src/app/actions/` the server actions the browser calls
