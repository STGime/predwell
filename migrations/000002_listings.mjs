// Listings aggregated from all sources. source_id carries a source prefix
// ('wg-12345', 'seed-001') and is globally unique — the platform's DDL
// surface only supports single-column unique constraints.
export async function up(api, { publicReadServiceWrite }) {
  await api.createTable('listings', [
    { name: 'id', type: 'uuid', is_primary_key: true, default_value: 'gen_random_uuid()' },
    { name: 'source', type: 'text' }, // 'wg_gesucht' | 'is24' | 'seed' (validated in app code)
    { name: 'source_id', type: 'text', is_unique: true },
    { name: 'title', type: 'text' },
    { name: 'url', type: 'text', nullable: true },
    {
      name: 'district_id',
      type: 'uuid',
      nullable: true,
      foreign_key: { column: 'district_id', referenced_table: 'districts', referenced_column: 'id', on_delete: 'SET NULL' },
    },
    { name: 'address_text', type: 'text', nullable: true },
    { name: 'lat', type: 'numeric', nullable: true },
    { name: 'lng', type: 'numeric', nullable: true },
    { name: 'price_warm', type: 'numeric', nullable: true },
    { name: 'price_cold', type: 'numeric', nullable: true },
    { name: 'size_sqm', type: 'numeric', nullable: true },
    { name: 'rooms', type: 'numeric', nullable: true },
    { name: 'available_from', type: 'date', nullable: true },
    { name: 'features', type: 'jsonb', nullable: true, default_value: "'{}'::jsonb" },
    { name: 'first_seen_at', type: 'timestamptz', default_value: 'now()' },
    { name: 'last_seen_at', type: 'timestamptz', default_value: 'now()' },
    { name: 'is_active', type: 'boolean', default_value: 'true' },
  ])
  await api.createIndex('listings', 'district_id')
  await api.createIndex('listings', 'first_seen_at')
  await publicReadServiceWrite('listings')
}

export async function down(api) {
  await api.dropTable('listings')
}
