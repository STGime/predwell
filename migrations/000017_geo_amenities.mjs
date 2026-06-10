// Berlin amenities from OpenStreetMap, used to compute each listing's walking
// distance to a Kita / school / park / transit / supermarket. Populated by
// scripts/sync-amenities.mjs (Overpass). Public-read (powers the neighborhood
// intelligence shown to users), service-write.
import { FUNC_ROLE } from '../scripts/lib/admin.mjs'

const SVC = `(current_user = '${FUNC_ROLE}' OR current_setting('app.end_user_role', true) = 'service')`

export async function up(api) {
  await api.createTable('geo_amenities', [
    { name: 'id', type: 'uuid', is_primary_key: true, default_value: 'gen_random_uuid()' },
    { name: 'type', type: 'text' }, // kita | school | park | transit | supermarket
    { name: 'osm_id', type: 'text', nullable: true },
    { name: 'name', type: 'text', nullable: true },
    { name: 'lat', type: 'numeric' },
    { name: 'lng', type: 'numeric' },
  ])
  await api.createIndex('geo_amenities', 'type')
  await api.createIndex('geo_amenities', 'lat')
  await api.createIndex('geo_amenities', 'lng')
  await api.createPolicy('geo_amenities', { name: 'public_select', command: 'SELECT', using: 'true' })
  await api.createPolicy('geo_amenities', { name: 'service_all', command: 'ALL', using: SVC, with_check: SVC })
}

export async function down(api) {
  await api.dropTable('geo_amenities')
}
