// Denormalized contact email on search_profiles. Edge functions run as the
// tenant func role, which CANNOT read the platform `users` table (its RLS
// policy calls public.current_end_user_id(), and the func role has no USAGE
// on schema public — euroback#188). So notify-matches can't join users to find
// who to email. We copy the user's email onto the profile at create/edit time
// (frontend has session.user.email) and read it from there.
export async function up(api) {
  await api.addColumn('search_profiles', { name: 'email', type: 'text', nullable: true })
}

export async function down(api) {
  await api.dropColumn('search_profiles', 'email')
}
