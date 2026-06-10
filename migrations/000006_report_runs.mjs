// Anonymous free-report runs from the landing page. Server-side backstop for
// the one-free-run-per-browser rule; becomes a lead list once email is
// captured. Edge-function access only.
export async function up(api, { serviceOnlyPolicies }) {
  await api.createTable('report_runs', [
    { name: 'id', type: 'uuid', is_primary_key: true, default_value: 'gen_random_uuid()' },
    { name: 'budget', type: 'integer', nullable: true },
    { name: 'rooms', type: 'text', nullable: true },
    { name: 'areas', type: 'text', nullable: true },
    { name: 'result', type: 'jsonb', nullable: true },
    { name: 'client_fingerprint', type: 'text', is_unique: true },
    { name: 'email', type: 'text', nullable: true },
    { name: 'created_at', type: 'timestamptz', nullable: true, default_value: 'now()' },
  ])
  await serviceOnlyPolicies('report_runs')
}

export async function down(api) {
  await api.dropTable('report_runs')
}
