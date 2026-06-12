#!/usr/bin/env node
// Deploy (create-or-update) an edge function via the platform API using a PAT,
// for when the `eurobase` CLI session has expired.
//
// Usage: EUROBASE_PAT=eb_pat_... node scripts/deploy-fn.mjs <name> [--verify-jwt]

import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assembleFunction } from './lib/assemble-fn.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const PAT = process.env.EUROBASE_PAT
const PID = '0515e4e2-e195-4018-ab19-f18aae213e2a'
const BASE = 'https://api.eurobase.app'
if (!PAT) throw new Error('EUROBASE_PAT required')

const name = process.argv[2]
const verifyJwt = process.argv.includes('--verify-jwt')
if (!name) throw new Error('usage: deploy-fn.mjs <name> [--verify-jwt]')

const code = assembleFunction(join(root, 'functions', `${name}.js`))
const headers = { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' }

// Try update (PUT); fall back to create (POST) if it doesn't exist yet
// (the gateway returns 404 or a 400 "no rows in result set" for an unknown fn).
let res = await fetch(`${BASE}/platform/projects/${PID}/functions/${name}`, {
  method: 'PUT',
  headers,
  body: JSON.stringify({ code, verify_jwt: verifyJwt }),
})
let body = await res.text()
if (!res.ok && (res.status === 404 || /no rows|not found/i.test(body))) {
  res = await fetch(`${BASE}/platform/projects/${PID}/functions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name, code, verify_jwt: verifyJwt }),
  })
  body = await res.text()
}
if (!res.ok) {
  console.error(`✗ ${name}: ${res.status} ${body.slice(0, 200)}`)
  process.exit(1)
}
const v = JSON.parse(body).version ?? '?'
console.log(`✓ ${name} deployed (v${v})`)
