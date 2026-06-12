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
  # deploy-fn.mjs resolves //#include directives (shared _ingest-core.js) and
  # deploys via the platform API with $EUROBASE_PAT (the CLI session expires
  # often and doesn't handle includes). verify_jwt is off for all of these.
  for fn in free-report parse-search scrape-wg-gesucht ingest-inberlinwohnen \
            ingest-openimmo match-engine enrich-listings notify-matches \
            daily-digest mollie-webhook; do
    node scripts/deploy-fn.mjs "$fn"
  done
  node scripts/deploy-fn.mjs create-checkout --verify-jwt  # needs ctx.user

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
