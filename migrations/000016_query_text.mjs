// Store the renter's original free-text wish alongside the parsed criteria,
// for transparency and future re-parsing when the vocabulary grows.
export async function up(api) {
  await api.addColumn('search_profiles', { name: 'query_text', type: 'text', nullable: true })
  await api.addColumn('report_runs', { name: 'query_text', type: 'text', nullable: true })
}

export async function down(api) {
  await api.dropColumn('search_profiles', 'query_text')
  await api.dropColumn('report_runs', 'query_text')
}
