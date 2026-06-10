// A user's saved search criteria. Free tier: 1 profile. Pro: 3 profiles.
// district_ids is a jsonb array of district uuids (no array column types
// on the DDL surface).
export async function up(api) {
  await api.createTable('search_profiles', [
    { name: 'id', type: 'uuid', is_primary_key: true, default_value: 'gen_random_uuid()' },
    {
      name: 'user_id',
      type: 'uuid',
      foreign_key: { column: 'user_id', referenced_table: 'users', referenced_column: 'id', on_delete: 'CASCADE' },
    },
    { name: 'name', type: 'text' },
    { name: 'budget_max', type: 'integer' },
    { name: 'rooms_min', type: 'numeric', default_value: '1' },
    { name: 'district_ids', type: 'jsonb', default_value: "'[]'::jsonb" },
    { name: 'features', type: 'jsonb', nullable: true, default_value: "'{}'::jsonb" },
    { name: 'is_active', type: 'boolean', default_value: 'true' },
    { name: 'created_at', type: 'timestamptz', nullable: true, default_value: 'now()' },
  ])
  await api.createIndex('search_profiles', 'user_id')

  const owner = 'public.is_service_role() OR user_id = auth_uid()'
  await api.createPolicy('search_profiles', { name: 'owner_select', command: 'SELECT', using: owner })
  await api.createPolicy('search_profiles', { name: 'owner_insert', command: 'INSERT', with_check: owner })
  await api.createPolicy('search_profiles', { name: 'owner_update', command: 'UPDATE', using: owner, with_check: owner })
  await api.createPolicy('search_profiles', { name: 'owner_delete', command: 'DELETE', using: owner })
}

export async function down(api) {
  await api.dropTable('search_profiles')
}
