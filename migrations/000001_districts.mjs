// Berlin districts with the historical stats that power availability forecasts.
export async function up(api, { publicReadServiceWrite }) {
  await api.createTable('districts', [
    { name: 'id', type: 'uuid', is_primary_key: true, default_value: 'gen_random_uuid()' },
    { name: 'name', type: 'text' },
    { name: 'slug', type: 'text', is_unique: true },
    { name: 'center_lat', type: 'numeric' },
    { name: 'center_lng', type: 'numeric' },
    { name: 'avg_rent_sqm', type: 'numeric' },
    { name: 'listing_velocity_hours', type: 'numeric' },
    { name: 'demand_score', type: 'integer' },
    { name: 'created_at', type: 'timestamptz', nullable: true, default_value: 'now()' },
  ])
  await publicReadServiceWrite('districts')
}

export async function down(api) {
  await api.dropTable('districts')
}
