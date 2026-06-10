// Daily per-district aggregates feeding prediction percentages and feed
// velocity insights. (district_id, date) uniqueness is enforced by the
// writers — composite unique constraints aren't supported by the DDL API.
export async function up(api, { publicReadServiceWrite }) {
  await api.createTable('listing_history', [
    { name: 'id', type: 'uuid', is_primary_key: true, default_value: 'gen_random_uuid()' },
    {
      name: 'district_id',
      type: 'uuid',
      foreign_key: { column: 'district_id', referenced_table: 'districts', referenced_column: 'id', on_delete: 'CASCADE' },
    },
    { name: 'date', type: 'date' },
    { name: 'new_listings', type: 'integer', default_value: '0' },
    { name: 'avg_price_warm', type: 'numeric', nullable: true },
    { name: 'median_hours_live', type: 'numeric', nullable: true },
  ])
  await api.createIndex('listing_history', 'district_id')
  await api.createIndex('listing_history', 'date')
  await publicReadServiceWrite('listing_history')
}

export async function down(api) {
  await api.dropTable('listing_history')
}
