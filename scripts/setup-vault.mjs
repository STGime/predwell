#!/usr/bin/env node
// Stores the payment/config secrets the edge functions read from Vault.
//
// Usage:
//   MOLLIE_API_KEY=test_xxx APP_URL=https://predwell.example node scripts/setup-vault.mjs
//
// Only sets keys that are present in the environment; never overwrites with
// empty values. PUBLIC_API_KEY and GATEWAY_URL default from .env.

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

const SECRETS = {
  MOLLIE_API_KEY: process.env.MOLLIE_API_KEY,
  APP_URL: process.env.APP_URL,
  GATEWAY_URL: process.env.GATEWAY_URL || process.env.EUROBASE_URL,
  PUBLIC_API_KEY: process.env.EUROBASE_PUBLIC_KEY,
}

for (const [name, value] of Object.entries(SECRETS)) {
  if (!value) {
    console.log(`- ${name}: not set, skipping`)
    continue
  }
  const { error } = await eb.vault.set(name, value, 'predwell app config')
  if (error) {
    console.error(`✗ ${name}: ${error}`)
    process.exitCode = 1
  } else {
    console.log(`✓ ${name}`)
  }
}
