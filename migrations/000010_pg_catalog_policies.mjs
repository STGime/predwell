// The tenant func role has no USAGE on schema public at all (euroback#188),
// so policies may not even *reference* public.is_service_role() /
// public.current_end_user_id() — expression init fails with "permission
// denied for schema public" before any branch logic runs.
//
// Final form: pg_catalog built-ins only. Service = the runner role by name
// OR the gateway's service GUC; owner = the gateway's end-user GUC. Both
// GUCs are read with current_setting(..., true), which every role may call.
import { FUNC_ROLE } from '../scripts/lib/admin.mjs'

const SVC = `(current_user = '${FUNC_ROLE}' OR current_setting('app.end_user_role', true) = 'service')`
const UID = `NULLIF(current_setting('app.end_user_id', true), '')::uuid`

const MATCH_OWNER = `EXISTS (
  SELECT 1 FROM search_profiles sp
  WHERE sp.id = matches.search_profile_id AND sp.user_id = ${UID})`

async function recreate(api, table, policies) {
  for (const p of policies) {
    await api.dropPolicy(table, p.name)
    await api.createPolicy(table, p)
  }
}

export async function up(api) {
  for (const table of ['districts', 'listings', 'listing_history', 'report_runs']) {
    await recreate(api, table, [
      { name: 'service_all', command: 'ALL', using: SVC, with_check: SVC },
    ])
  }

  const profileOwner = `(${SVC} OR user_id = ${UID})`
  await recreate(api, 'search_profiles', [
    { name: 'owner_select', command: 'SELECT', using: profileOwner },
    { name: 'owner_insert', command: 'INSERT', with_check: profileOwner },
    { name: 'owner_update', command: 'UPDATE', using: profileOwner, with_check: profileOwner },
    { name: 'owner_delete', command: 'DELETE', using: profileOwner },
  ])

  const matchOwner = `(${SVC} OR ${MATCH_OWNER})`
  await recreate(api, 'matches', [
    { name: 'owner_select', command: 'SELECT', using: matchOwner },
    { name: 'service_insert', command: 'INSERT', with_check: SVC },
    { name: 'owner_update', command: 'UPDATE', using: matchOwner, with_check: matchOwner },
    { name: 'owner_delete', command: 'DELETE', using: matchOwner },
  ])

  await recreate(api, 'subscriptions', [
    { name: 'owner_select', command: 'SELECT', using: `(${SVC} OR user_id = ${UID})` },
    { name: 'service_insert', command: 'INSERT', with_check: SVC },
    { name: 'service_update', command: 'UPDATE', using: SVC, with_check: SVC },
  ])
}

export async function down() {
  throw new Error('000010 has no down migration')
}
