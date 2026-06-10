// A listing matched to a search profile by the match engine. status doubles
// as the application-tracker pipeline: new → seen → contacted → applied →
// viewing → rejected/won (validated in app code). (search_profile_id,
// listing_id) uniqueness is enforced by the match engine.
export async function up(api) {
  await api.createTable('matches', [
    { name: 'id', type: 'uuid', is_primary_key: true, default_value: 'gen_random_uuid()' },
    {
      name: 'search_profile_id',
      type: 'uuid',
      foreign_key: { column: 'search_profile_id', referenced_table: 'search_profiles', referenced_column: 'id', on_delete: 'CASCADE' },
    },
    {
      name: 'listing_id',
      type: 'uuid',
      foreign_key: { column: 'listing_id', referenced_table: 'listings', referenced_column: 'id', on_delete: 'CASCADE' },
    },
    { name: 'score', type: 'integer' },
    { name: 'status', type: 'text', default_value: "'new'" },
    { name: 'notes', type: 'text', nullable: true },
    { name: 'matched_at', type: 'timestamptz', default_value: 'now()' },
  ])
  await api.createIndex('matches', 'search_profile_id')

  // Owned via the parent search profile; the match engine (service) inserts.
  const owner = `public.is_service_role() OR EXISTS (
    SELECT 1 FROM search_profiles sp
    WHERE sp.id = matches.search_profile_id AND sp.user_id = auth_uid())`
  await api.createPolicy('matches', { name: 'owner_select', command: 'SELECT', using: owner })
  await api.createPolicy('matches', { name: 'service_insert', command: 'INSERT', with_check: 'public.is_service_role()' })
  await api.createPolicy('matches', { name: 'owner_update', command: 'UPDATE', using: owner, with_check: owner })
  await api.createPolicy('matches', { name: 'owner_delete', command: 'DELETE', using: owner })
}

export async function down(api) {
  await api.dropTable('matches')
}
