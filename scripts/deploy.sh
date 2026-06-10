#!/usr/bin/env bash
# Predwell deploy script — the single entry point for shipping changes.
#
#   ./scripts/deploy.sh            # everything: migrations, functions, schedules, vault, frontend
#   ./scripts/deploy.sh functions  # just edge functions + schedules
#
# Prerequisites:
#   - .env with EUROBASE_URL / EUROBASE_PUBLIC_KEY / EUROBASE_SECRET_KEY
#   - `eurobase login` (CLI session) for edge function deploys
#   - optional: MOLLIE_API_KEY / APP_URL in env for vault setup

set -euo pipefail
cd "$(dirname "$0")/.."

STEP="${1:-all}"

if [[ "$STEP" == "all" || "$STEP" == "migrations" ]]; then
  echo "==> Applying migrations"
  node scripts/apply-migrations.mjs
  echo "==> Seeding reference data (idempotent)"
  node scripts/seed.mjs
fi

if [[ "$STEP" == "all" || "$STEP" == "functions" ]]; then
  echo "==> Deploying edge functions"
  eurobase edge-functions deploy free-report      -f functions/free-report.js      --no-verify-jwt
  eurobase edge-functions deploy scrape-wg-gesucht -f functions/scrape-wg-gesucht.js --no-verify-jwt
  eurobase edge-functions deploy match-engine     -f functions/match-engine.js     --no-verify-jwt
  eurobase edge-functions deploy create-checkout  -f functions/create-checkout.js
  eurobase edge-functions deploy mollie-webhook   -f functions/mollie-webhook.js   --no-verify-jwt

  echo "==> Provisioning schedules"
  node scripts/setup-schedules.mjs
fi

if [[ "$STEP" == "all" || "$STEP" == "vault" ]]; then
  echo "==> Syncing vault config"
  node scripts/setup-vault.mjs
fi

if [[ "$STEP" == "all" || "$STEP" == "frontend" ]]; then
  echo "==> Building frontend"
  (cd frontend && npm run build)
  echo "Frontend built to frontend/dist — upload to your EU host (Hetzner / Eurobase static hosting)."
fi

echo "Done."
