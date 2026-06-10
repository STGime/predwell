# Predwell

**Find your Berlin apartment before it's listed.** Predwell aggregates rental
listings, matches them against historical availability data, and predicts
where apartments will open next — so renters contact landlords first.

EU-sovereign stack: [Eurobase](https://eurobase.app) backend (Scaleway,
Paris), Mollie payments (NL), no US cloud services.

## Layout

```
frontend/    Vite + React + TypeScript PWA (landing page + dashboard)
functions/   Eurobase edge functions (sandboxed JS, no imports —
             globalThis.handler = async (req, ctx) => ...)
migrations/  Executable schema migrations (drive the validated DDL REST API;
             raw tenant SQL is SELECT-only on Eurobase)
scripts/     deploy.sh, apply-migrations, seed, schedules, vault, local test
```

## Quick start

```bash
cp .env.example .env          # fill in Eurobase keys
cd frontend && npm install && npm run dev   # http://localhost:3000
```

Backend setup (once per environment):

```bash
node scripts/apply-migrations.mjs   # schema + RLS policies
node scripts/seed.mjs               # 12 Berlin districts, 90d history, seed listings
eurobase login                      # CLI session for function deploys
./scripts/deploy.sh functions       # deploy 5 edge functions + cron schedules
MOLLIE_API_KEY=test_xxx ./scripts/deploy.sh vault   # payment config
```

## Edge functions

| Function | Auth | Purpose |
|----------|------|---------|
| `free-report` | anonymous | Landing-page district report + lead capture; one run per browser fingerprint |
| `scrape-wg-gesucht` | cron 15min | Polls WG-Gesucht Berlin feeds, upserts listings, daily history rollup |
| `match-engine` | cron 5min | Scores fresh listings against active search profiles (budget 40 / rooms 20 / district 25 / freshness 15) |
| `create-checkout` | end-user JWT | Mollie customer + first payment (mandate) for Pro €19/month |
| `mollie-webhook` | anonymous* | Payment status → activate/renew/cancel subscription (*trust = re-fetching the payment from Mollie) |

## Platform notes (learned the hard way)

- Tenant raw SQL (`POST /v1/db/sql`) is **SELECT-only**; schema changes go
  through `/v1/db/schema/tables/*` — hence executable `.mjs` migrations.
- Edge functions run as the `<schema>_func` Postgres role with **no service
  GUC**, so RLS policies include `current_user = '<schema>_func'` in their
  service branch (migration 000008).
- Function code is evaluated with `new Function` in a `permissions: 'none'`
  worker: no imports, no TS syntax; outbound `fetch` works; DB via
  `ctx.db.sql(query, params)`.
- The DDL surface has no composite unique constraints or CHECK constraints —
  `(source, source_id)` style dedup lives in the writers.
- Test functions locally without deploying:
  `node scripts/test-function-local.mjs functions/free-report.js '{"budget":"€1,500"}'`

## Tiers

Free: 1 search profile, 1 free landing report. Pro (€19/month via Mollie):
3 profiles, unlimited runs, early alerts.
