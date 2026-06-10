#!/usr/bin/env node
// Provisions cron schedules for the deployed edge functions. Idempotent.
// Run after `eurobase edge-functions deploy` (functions must exist first).
//
// Usage: node scripts/setup-schedules.mjs

import { createClient } from '@eurobase/sdk'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
for (const line of readFileSync(join(root, '.env'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
}

const eb = createClient({
  url: process.env.EUROBASE_URL,
  apiKey: process.env.EUROBASE_SECRET_KEY,
})

const SCHEDULES = [
  {
    name: 'scrape-wg-gesucht',
    spec: {
      functionName: 'scrape-wg-gesucht',
      // Hourly (not 15-min): WG-Gesucht is a fragile, best-effort source
      // with anti-bot + DB-right concerns. The function self-throttles via
      // scrape_state backoff on 429/403.
      cron: '0 * * * *',
      timezone: 'UTC', // gateway rejects IANA zones (euroback#193)
      description: 'Poll WG-Gesucht Berlin feeds for new listings (hourly, block-aware)',
    },
  },
  {
    name: 'match-engine',
    spec: {
      functionName: 'match-engine',
      cron: '*/5 * * * *',
      timezone: 'UTC', // gateway rejects IANA zones (euroback#193)
      description: 'Score fresh listings against active search profiles',
    },
  },
]

for (const { name, spec } of SCHEDULES) {
  const { data, error } = await eb.functions.schedules.createOrUpdate(name, spec)
  if (error) {
    console.error(`✗ ${name}: ${error.message}`)
    process.exitCode = 1
  } else {
    console.log(`✓ ${name} → ${data.cron} (${data.timezone}), enabled=${data.enabled}`)
  }
}
