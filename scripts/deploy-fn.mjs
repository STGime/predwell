#!/usr/bin/env node
// Deploy (create-or-update) an edge function via the platform API using a PAT,
// for when the `eurobase` CLI session has expired.
//
// Usage: EUROBASE_PAT=eb_pat_... node scripts/deploy-fn.mjs <name> [--verify-jwt]

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const PAT = process.env.EUROBASE_PAT
const PID = '0515e4e2-e195-4018-ab19-f18aae213e2a'
const BASE = 'https://api.eurobase.app'
if (!PAT) throw new Error('EUROBASE_PAT required')

const name = process.argv[2]
const verifyJwt = process.argv.includes('--verify-jwt')
if (!name) throw new Error('usage: deploy-fn.mjs <name> [--verify-jwt]')

const code = readFileSync(join(root, 'functions', `${name}.js`), 'utf8')
const headers = { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' }

// Try update (PUT); fall back to create (POST) if it doesn't exist yet.
let res = await fetch(`${BASE}/platform/projects/${PID}/functions/${name}`, {
  method: 'PUT',
  headers,
  body: JSON.stringify({ code, verify_jwt: verifyJwt }),
})
if (res.status === 404) {
  res = await fetch(`${BASE}/platform/projects/${PID}/functions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name, code, verify_jwt: verifyJwt }),
  })
}
const body = await res.text()
if (!res.ok) {
  console.error(`✗ ${name}: ${res.status} ${body.slice(0, 200)}`)
  process.exit(1)
}
const v = JSON.parse(body).version ?? '?'
console.log(`✓ ${name} deployed (v${v})`)
