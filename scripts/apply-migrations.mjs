#!/usr/bin/env node
// Applies pending migrations from migrations/*.mjs to the Eurobase project.
// Each migration exports up(api, helpers) / down(api, helpers) and drives the
// gateway's validated DDL + data REST endpoints (raw tenant SQL is
// SELECT-only on Eurobase).
//
// Applied versions are tracked in a app_migrations table.
//
// Usage:
//   node scripts/apply-migrations.mjs            # apply all pending
//   node scripts/apply-migrations.mjs --down 000007   # roll back one version

import { readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { api, publicReadServiceWrite, serviceOnlyPolicies } from './lib/admin.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const helpers = { publicReadServiceWrite, serviceOnlyPolicies }

// Bootstrap the bookkeeping table on first run. (information_schema is out
// of scope for tenant SQL, so probe the table directly.)
const hasMigrationsTable = await api
  .sql('SELECT 1 FROM app_migrations LIMIT 1')
  .then(() => true)
  .catch(() => false)
if (!hasMigrationsTable) {
  await api.createTable('app_migrations', [
    { name: 'id', type: 'uuid', is_primary_key: true, default_value: 'gen_random_uuid()' },
    { name: 'version', type: 'text', is_unique: true },
    { name: 'applied_at', type: 'timestamptz', nullable: true, default_value: 'now()' },
  ])
  await serviceOnlyPolicies('app_migrations')
  console.log('Created app_migrations table.')
}

const appliedRes = await api.sql('SELECT id, version FROM app_migrations')
const applied = new Map((appliedRes.rows || []).map((r) => [r.version, r.id]))

const files = readdirSync(join(root, 'migrations'))
  .filter((f) => f.endsWith('.mjs'))
  .sort()

const downTarget = process.argv.includes('--down')
  ? process.argv[process.argv.indexOf('--down') + 1]
  : null

if (downTarget) {
  const file = files.find((f) => f.startsWith(downTarget))
  if (!file) {
    console.error(`No migration found for version ${downTarget}`)
    process.exit(1)
  }
  if (!applied.has(downTarget)) {
    console.log(`${downTarget} is not applied; nothing to do.`)
    process.exit(0)
  }
  const mod = await import(pathToFileURL(join(root, 'migrations', file)).href)
  await mod.down(api, helpers)
  await api.remove('app_migrations', applied.get(downTarget))
  console.log(`Rolled back ${file}`)
  process.exit(0)
}

let ran = 0
for (const file of files) {
  const version = file.split('_')[0]
  if (applied.has(version)) continue
  process.stdout.write(`Applying ${file} ... `)
  const mod = await import(pathToFileURL(join(root, 'migrations', file)).href)
  await mod.up(api, helpers)
  await api.insert('app_migrations', { version })
  console.log('ok')
  ran++
}

console.log(ran === 0 ? 'No pending migrations.' : `Applied ${ran} migration(s).`)
