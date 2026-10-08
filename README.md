# Sysd

Draw a system, set the traffic, and see where it breaks and what each choice costs. Free to use, sign-in with GitHub or Google.

- Next.js 16 (App Router, Cache Components), React Flow canvas, Auth.js (GitHub and Google only)
- Prices and plans come from fetched pages and carry their source URL and fetch date. Anything without real prices is labelled illustrative.

## Run it

```bash
npm install
cp .env.example .env.local   # then fill in the values, see the comments inside
npm run dev -- -p 3123
```

Sign-in needs a GitHub OAuth app and a Google OAuth client. The callback URLs are `/api/auth/callback/github` and `/api/auth/callback/google` on whatever host you run.

## Scripts

- `node scripts/build-brand-icons.mjs` bundles the logos listed in `src/lib/catalog/iconMap.ts`.
- `node scripts/build-logo-pngs.mjs` renders the logo PNGs in `public/brand/` (needs Chrome).

## Where things are

- `src/lib/catalog/` services, providers, plans and sizing rules
- `src/lib/pricing/` real-price data, monthly estimates and ranking
- `src/lib/sim.ts`, `fit.ts`, `analysis.ts` the traffic, fit and cost model
- `src/components/studio/` the canvas, panels and pickers
