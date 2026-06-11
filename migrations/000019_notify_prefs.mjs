// Per-profile notification preferences. email already exists (000015); these
// say which channels to alert on. Default: email on, push off (web push isn't
// wired yet). notify-matches respects notify_email.
export async function up(api) {
  await api.addColumn('search_profiles', { name: 'notify_email', type: 'boolean', default_value: 'true' })
  await api.addColumn('search_profiles', { name: 'notify_push', type: 'boolean', default_value: 'false' })
}

export async function down(api) {
  await api.dropColumn('search_profiles', 'notify_push')
  await api.dropColumn('search_profiles', 'notify_email')
}
