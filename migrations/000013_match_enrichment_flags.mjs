// Enrichment surfaced onto matches for the dashboard: flags (display chips),
// fit_note (Mistral's one-line "why this fits / caution"), and notified_at so
// instant alerts fire exactly once per match.
export async function up(api) {
  await api.addColumn('matches', { name: 'flags', type: 'jsonb', nullable: true })
  await api.addColumn('matches', { name: 'fit_note', type: 'text', nullable: true })
  await api.addColumn('matches', { name: 'notified_at', type: 'timestamptz', nullable: true })
}

export async function down(api) {
  await api.dropColumn('matches', 'notified_at')
  await api.dropColumn('matches', 'fit_note')
  await api.dropColumn('matches', 'flags')
}
