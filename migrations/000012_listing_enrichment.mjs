// LLM enrichment columns on listings. enrichment holds Mistral's structured
// classification of the listing text (flags + summary); enriched_at gates the
// idempotent enrichment passes; enrich_level records how deep we went
// ('title' = from the headline only, 'detail' = full description page).
export async function up(api) {
  await api.addColumn('listings', { name: 'enrichment', type: 'jsonb', nullable: true })
  await api.addColumn('listings', { name: 'enriched_at', type: 'timestamptz', nullable: true })
  await api.addColumn('listings', { name: 'enrich_level', type: 'text', nullable: true })
}

export async function down(api) {
  await api.dropColumn('listings', 'enrich_level')
  await api.dropColumn('listings', 'enriched_at')
  await api.dropColumn('listings', 'enrichment')
}
