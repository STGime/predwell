#!/usr/bin/env node
// Local smoke-test harness for edge functions. Emulates the runner contract:
// loads a function file, exposes ctx.db.sql / ctx.log / ctx.env, and invokes
// globalThis.handler with a Request. SELECTs hit the real project database;
// writes are logged and mocked (the live SQL endpoint is SELECT-only).
//
// Usage: node scripts/test-function-local.mjs functions/free-report.js '{"budget":"€1,500"}'

import { readFileSync } from 'node:fs'
import { api } from './lib/admin.mjs'

const [file, payload] = process.argv.slice(2)
if (!file) {
  console.error('Usage: node scripts/test-function-local.mjs <function-file> [json-body]')
  process.exit(1)
}

let mockRows = []
const ctx = {
  db: {
    sql: async (query, params = []) => {
      const isWrite = /^\s*(insert|update|delete)/i.test(query)
      if (isWrite) {
        console.log('  [mock write]', query.trim().split('\n')[0], params)
        // RETURNING id support for inserts.
        return /returning\s+id/i.test(query) ? [{ id: '00000000-0000-4000-8000-000000000000' }] : []
      }
      // Inline params for the SELECT-only endpoint (test harness only).
      let inlined = query
      params.forEach((p, i) => {
        const lit = typeof p === 'number' ? String(p) : `'${String(p).replaceAll("'", "''")}'`
        inlined = inlined.replaceAll(`$${i + 1}`, lit)
      })
      const res = await api.sql(inlined)
      return res.rows || []
    },
  },
  // Vault reads fall back to process.env so the LLM/email paths can be
  // exercised locally: e.g. `MISTRAL_API_KEY=... node scripts/test-function-local.mjs ...`
  vault: { get: async (name) => process.env[name] ?? null },
  storage: {},
  env: {},
  user: null,
  requestId: 'local-test',
  log: {
    info: (m, d) => console.log('  [log]', m, d ?? ''),
    warn: (m, d) => console.warn('  [warn]', m, d ?? ''),
    error: (m, d) => console.error('  [error]', m, d ?? ''),
  },
}
void mockRows

const code = readFileSync(file, 'utf8')
new Function(code)() // mirrors the runner: assigns globalThis.handler

const req = new Request('http://localhost/fn', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: payload || '{}',
})

const result = await globalThis.handler(req, ctx)
if (result instanceof Response) {
  console.log('Status:', result.status)
  console.log('Body:', await result.text())
} else {
  console.log('Returned:', JSON.stringify(result, null, 2))
}
