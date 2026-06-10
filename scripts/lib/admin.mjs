// Admin client for the Eurobase gateway used by migrations and seeds.
// Talks to the tenant DDL surface (/v1/db/schema/tables/*) and the data
// REST surface (/v1/db/{table}) with the project secret key.
//
// Raw tenant SQL is SELECT-only on this platform, so all schema changes
// go through these validated endpoints. Notable platform constraints:
//   - column types must be plain (numeric, not numeric(8,2))
//   - unique constraints and indexes are single-column
//   - no CHECK constraints (validate in app/edge functions)

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

for (const line of readFileSync(join(root, '.env'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
}

const URL_BASE = process.env.EUROBASE_URL
const SECRET = process.env.EUROBASE_SECRET_KEY
if (!URL_BASE || !SECRET) {
  throw new Error('EUROBASE_URL and EUROBASE_SECRET_KEY must be set in .env')
}

async function call(method, path, body) {
  const res = await fetch(`${URL_BASE}${path}`, {
    method,
    headers: { apikey: SECRET, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  let data = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { raw: text }
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} failed (${res.status}): ${data.error || text}`)
  }
  return data
}

// The edge-function runner executes SQL as this per-tenant role with no
// service GUC set, so RLS "service" checks must also accept it by name.
export const PROJECT_ID = '0515e4e2-e195-4018-ab19-f18aae213e2a'
export const FUNC_ROLE = `tenant_${PROJECT_ID.replaceAll('-', '_')}_func`
export const SVC = `(public.is_service_role() OR current_user = '${FUNC_ROLE}')`

export const api = {
  /** SELECT-only raw SQL. */
  sql: (query) => call('POST', '/v1/db/sql', { sql: query }),

  // --- DDL ---
  createTable: (name, columns, opts = {}) =>
    call('POST', '/v1/db/schema/tables/', { name, columns, rls_preset: opts.rlsPreset ?? 'none' }),
  dropTable: (name) => call('DELETE', `/v1/db/schema/tables/${name}`),
  addForeignKey: (table, fk) => call('POST', `/v1/db/schema/tables/${table}/foreign-keys`, fk),
  addUnique: (table, column) =>
    call('POST', `/v1/db/schema/tables/${table}/constraints/unique`, { column }),
  createIndex: (table, column, unique = false) =>
    call('POST', `/v1/db/schema/tables/${table}/indexes`, { column, unique }),
  createPolicy: (table, policy) => call('POST', `/v1/db/schema/tables/${table}/policies`, policy),
  dropPolicy: (table, name) => call('DELETE', `/v1/db/schema/tables/${table}/policies/${name}`),
  toggleRLS: (table, enabled) => call('POST', `/v1/db/schema/tables/${table}/rls`, { enabled }),

  // --- Data (service-role REST) ---
  insert: (table, row) => call('POST', `/v1/db/${table}`, row),
  update: (table, id, patch) => call('PATCH', `/v1/db/${table}/${id}`, patch),
  remove: (table, id) => call('DELETE', `/v1/db/${table}/${id}`),
  select: (table, params = '') => call('GET', `/v1/db/${table}${params ? `?${params}` : ''}`),
}

/** Service-only RLS policy set: edge functions and the secret key only. */
export async function serviceOnlyPolicies(table) {
  await api.createPolicy(table, {
    name: 'service_all',
    command: 'ALL',
    using: 'public.is_service_role()',
    with_check: 'public.is_service_role()',
  })
}

/** Public-read, service-write policy set for market data tables. */
export async function publicReadServiceWrite(table) {
  await api.createPolicy(table, { name: 'public_select', command: 'SELECT', using: 'true' })
  await serviceOnlyPolicies(table)
}
