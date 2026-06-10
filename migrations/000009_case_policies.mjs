// The tenant func role has no EXECUTE grant on public.is_service_role() /
// public.current_end_user_id() (euroback#188): any policy that *evaluates*
// those helpers under the runner errors with "permission denied for
// function". OR gives no evaluation-order guarantee, so policies are
// rewritten as CASE expressions — CASE guarantees the func-role branch
// short-circuits before the public.* helpers are reached.
import { FUNC_ROLE } from '../scripts/lib/admin.mjs'

const FN = `current_user = '${FUNC_ROLE}'`

// CASE-wrapped: func role → true; gateway service → true; else owner check.
const svc = () => `CASE WHEN ${FN} THEN true ELSE public.is_service_role() END`
const svcOr = (ownerExpr) =>
  `CASE WHEN ${FN} THEN true WHEN public.is_service_role() THEN true ELSE ${ownerExpr} END`

const MATCH_OWNER = `EXISTS (
  SELECT 1 FROM search_profiles sp
  WHERE sp.id = matches.search_profile_id AND sp.user_id = auth_uid())`

async function recreate(api, table, policies) {
  for (const p of policies) {
    await api.dropPolicy(table, p.name)
    await api.createPolicy(table, p)
  }
}

export async function up(api) {
  for (const table of ['districts', 'listings', 'listing_history', 'report_runs']) {
    await recreate(api, table, [
      { name: 'service_all', command: 'ALL', using: svc(), with_check: svc() },
    ])
  }

  const profileOwner = svcOr('user_id = auth_uid()')
  await recreate(api, 'search_profiles', [
    { name: 'owner_select', command: 'SELECT', using: profileOwner },
    { name: 'owner_insert', command: 'INSERT', with_check: profileOwner },
    { name: 'owner_update', command: 'UPDATE', using: profileOwner, with_check: profileOwner },
    { name: 'owner_delete', command: 'DELETE', using: profileOwner },
  ])

  const matchOwner = svcOr(MATCH_OWNER)
  await recreate(api, 'matches', [
    { name: 'owner_select', command: 'SELECT', using: matchOwner },
    { name: 'service_insert', command: 'INSERT', with_check: svc() },
    { name: 'owner_update', command: 'UPDATE', using: matchOwner, with_check: matchOwner },
    { name: 'owner_delete', command: 'DELETE', using: matchOwner },
  ])

  await recreate(api, 'subscriptions', [
    { name: 'owner_select', command: 'SELECT', using: svcOr('user_id = auth_uid()') },
    { name: 'service_insert', command: 'INSERT', with_check: svc() },
    { name: 'service_update', command: 'UPDATE', using: svc(), with_check: svc() },
  ])
}

export async function down() {
  throw new Error('000009 has no down migration — re-run 000008 policies if needed')
}
