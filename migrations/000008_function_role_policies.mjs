// The edge-function runner executes SQL under the per-tenant `<schema>_func`
// role WITHOUT the `app.end_user_role = 'service'` GUC, so
// public.is_service_role() is false and auth_uid() is NULL inside functions.
// Recreate every policy so the "service" branch also accepts that role by
// current_user. (Functions filter user-owned rows by ctx.user.id explicitly.)
import { SVC } from '../scripts/lib/admin.mjs'

const MARKET_TABLES = ['districts', 'listings', 'listing_history']

export async function up(api) {
  // Market data: public read stays; service write gains the func role.
  for (const table of MARKET_TABLES) {
    await api.dropPolicy(table, 'service_all')
    await api.createPolicy(table, { name: 'service_all', command: 'ALL', using: SVC, with_check: SVC })
  }

  await api.dropPolicy('report_runs', 'service_all')
  await api.createPolicy('report_runs', { name: 'service_all', command: 'ALL', using: SVC, with_check: SVC })

  const profileOwner = `${SVC} OR user_id = auth_uid()`
  await api.dropPolicy('search_profiles', 'owner_select')
  await api.dropPolicy('search_profiles', 'owner_insert')
  await api.dropPolicy('search_profiles', 'owner_update')
  await api.dropPolicy('search_profiles', 'owner_delete')
  await api.createPolicy('search_profiles', { name: 'owner_select', command: 'SELECT', using: profileOwner })
  await api.createPolicy('search_profiles', { name: 'owner_insert', command: 'INSERT', with_check: profileOwner })
  await api.createPolicy('search_profiles', { name: 'owner_update', command: 'UPDATE', using: profileOwner, with_check: profileOwner })
  await api.createPolicy('search_profiles', { name: 'owner_delete', command: 'DELETE', using: profileOwner })

  const matchOwner = `${SVC} OR EXISTS (
    SELECT 1 FROM search_profiles sp
    WHERE sp.id = matches.search_profile_id AND sp.user_id = auth_uid())`
  await api.dropPolicy('matches', 'owner_select')
  await api.dropPolicy('matches', 'service_insert')
  await api.dropPolicy('matches', 'owner_update')
  await api.dropPolicy('matches', 'owner_delete')
  await api.createPolicy('matches', { name: 'owner_select', command: 'SELECT', using: matchOwner })
  await api.createPolicy('matches', { name: 'service_insert', command: 'INSERT', with_check: SVC })
  await api.createPolicy('matches', { name: 'owner_update', command: 'UPDATE', using: matchOwner, with_check: matchOwner })
  await api.createPolicy('matches', { name: 'owner_delete', command: 'DELETE', using: matchOwner })

  await api.dropPolicy('subscriptions', 'owner_select')
  await api.dropPolicy('subscriptions', 'service_insert')
  await api.dropPolicy('subscriptions', 'service_update')
  await api.createPolicy('subscriptions', {
    name: 'owner_select',
    command: 'SELECT',
    using: `${SVC} OR user_id = auth_uid()`,
  })
  await api.createPolicy('subscriptions', { name: 'service_insert', command: 'INSERT', with_check: SVC })
  await api.createPolicy('subscriptions', { name: 'service_update', command: 'UPDATE', using: SVC, with_check: SVC })
}

export async function down() {
  // The previous policies (is_service_role-only) are restored by re-running
  // migrations 000001–000007 from scratch; no standalone rollback.
  throw new Error('000008 has no down migration')
}
