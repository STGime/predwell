// Predwell Pro subscriptions, billed via Mollie (EU payment provider).
// status: pending | active | canceled | past_due (validated in app code).
export async function up(api) {
  await api.createTable('subscriptions', [
    { name: 'id', type: 'uuid', is_primary_key: true, default_value: 'gen_random_uuid()' },
    {
      name: 'user_id',
      type: 'uuid',
      is_unique: true,
      foreign_key: { column: 'user_id', referenced_table: 'users', referenced_column: 'id', on_delete: 'CASCADE' },
    },
    { name: 'mollie_customer_id', type: 'text', nullable: true },
    { name: 'mollie_subscription_id', type: 'text', nullable: true },
    { name: 'status', type: 'text', default_value: "'pending'" },
    { name: 'plan', type: 'text', default_value: "'pro'" },
    { name: 'current_period_end', type: 'timestamptz', nullable: true },
    { name: 'created_at', type: 'timestamptz', nullable: true, default_value: 'now()' },
    { name: 'updated_at', type: 'timestamptz', nullable: true, default_value: 'now()' },
  ])

  // Users read their own row; only the service (checkout/webhook) writes.
  await api.createPolicy('subscriptions', {
    name: 'owner_select',
    command: 'SELECT',
    using: 'public.is_service_role() OR user_id = auth_uid()',
  })
  await api.createPolicy('subscriptions', { name: 'service_insert', command: 'INSERT', with_check: 'public.is_service_role()' })
  await api.createPolicy('subscriptions', {
    name: 'service_update',
    command: 'UPDATE',
    using: 'public.is_service_role()',
    with_check: 'public.is_service_role()',
  })
}

export async function down(api) {
  await api.dropTable('subscriptions')
}
