// Tracks whether a listing has been geocoded (lat/lng populated) so the geo
// pass is idempotent. lat/lng columns already exist (migration 000002); the
// scraper leaves them null, enrich-listings fills them from the detail page
// (or Nominatim fallback).
export async function up(api) {
  await api.addColumn('listings', { name: 'geocoded_at', type: 'timestamptz', nullable: true })
}

export async function down(api) {
  await api.dropColumn('listings', 'geocoded_at')
}
