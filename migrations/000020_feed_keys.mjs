// API keys for OpenImmo feed partners (agents / property managers / CRMs).
// The ingest-openimmo endpoint authenticates each POST against a sha256 key
// hash here. Service-only access (the edge function reads it; no client access).
import { FUNC_ROLE } from '../scripts/lib/admin.mjs'

const SVC = `(current_user = '${FUNC_ROLE}' OR current_setting('app.end_user_role', true) = 'service')`

export async function up(api) {
  await api.createTable('feed_keys', [
    { name: 'id', type: 'uuid', is_primary_key: true, default_value: 'gen_random_uuid()' },
    { name: 'name', type: 'text' }, // partner label (agency / co-op / CRM)
    { name: 'key_hash', type: 'text', is_unique: true }, // sha256 hex of the plaintext key
    { name: 'active', type: 'boolean', default_value: 'true' },
    { name: 'created_at', type: 'timestamptz', nullable: true, default_value: 'now()' },
  ])
  await api.createPolicy('feed_keys', { name: 'service_all', command: 'ALL', using: SVC, with_check: SVC })
}

export async function down(api) {
  await api.dropTable('feed_keys')
}
