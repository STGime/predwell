// Daily global market digest (the "Steglitz strong, Mitte slow over €X" prose).
// One row per day; body stored in EN + DE, with the stats that fed the LLM.
// Public-read (non-sensitive market summary, shown on landing/dashboard),
// service-write (the daily-digest function runs as the func role — see #188,
// so the service branch must accept that role by name, same as migration 000010/11).
import { FUNC_ROLE } from '../scripts/lib/admin.mjs'

const SVC = `(current_user = '${FUNC_ROLE}' OR current_setting('app.end_user_role', true) = 'service')`

export async function up(api) {
  await api.createTable('digests', [
    { name: 'id', type: 'uuid', is_primary_key: true, default_value: 'gen_random_uuid()' },
    { name: 'date', type: 'date', is_unique: true },
    { name: 'scope', type: 'text', default_value: "'market'" },
    { name: 'body_en', type: 'text', nullable: true },
    { name: 'body_de', type: 'text', nullable: true },
    { name: 'stats', type: 'jsonb', nullable: true },
    { name: 'created_at', type: 'timestamptz', nullable: true, default_value: 'now()' },
  ])
  await api.createPolicy('digests', { name: 'public_select', command: 'SELECT', using: 'true' })
  await api.createPolicy('digests', { name: 'service_all', command: 'ALL', using: SVC, with_check: SVC })
}

export async function down(api) {
  await api.dropTable('digests')
}
