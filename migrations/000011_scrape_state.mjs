// Per-source scraper state for block-aware backoff. The scraper is a
// stateless cron function, so consecutive-block tracking and the
// blocked_until cooldown have to live in the database. Keyed by source so
// future adapters (is24) reuse the same backoff machinery.
import { FUNC_ROLE } from '../scripts/lib/admin.mjs'

const SVC = `(current_user = '${FUNC_ROLE}' OR current_setting('app.end_user_role', true) = 'service')`

export async function up(api) {
  await api.createTable('scrape_state', [
    { name: 'id', type: 'uuid', is_primary_key: true, default_value: 'gen_random_uuid()' },
    { name: 'source', type: 'text', is_unique: true },
    { name: 'consecutive_failures', type: 'integer', default_value: '0' },
    { name: 'blocked_until', type: 'timestamptz', nullable: true },
    { name: 'last_run_at', type: 'timestamptz', nullable: true },
    { name: 'last_status', type: 'text', nullable: true },
    { name: 'updated_at', type: 'timestamptz', nullable: true, default_value: 'now()' },
  ])
  await api.createPolicy('scrape_state', { name: 'service_all', command: 'ALL', using: SVC, with_check: SVC })
}

export async function down(api) {
  await api.dropTable('scrape_state')
}
