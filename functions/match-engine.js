// match-engine — scores fresh listings against active search profiles and
// inserts matches. Runs on a 5-minute schedule; also invocable manually.
//
// Scoring (0–100): budget fit 40 + rooms 20 + district preference 25 +
// freshness 15. Matches with score >= 50 are inserted. The
// (search_profile_id, listing_id) pair is deduplicated here — the DDL
// surface has no composite unique constraints.

const MIN_SCORE = 50

function scoreListing(profile, listing, preferredDistricts) {
  let score = 0

  // Budget fit: 40 points comfortably under budget, 30 right at budget,
  // fading to 0 at 15% over.
  if (listing.price_warm != null) {
    const ratio = Number(listing.price_warm) / profile.budget_max
    if (ratio <= 0.85) score += 40
    else if (ratio <= 1) score += Math.round(40 - ((ratio - 0.85) / 0.15) * 10)
    else if (ratio <= 1.15) score += Math.round(20 * (1 - (ratio - 1) / 0.15))
  } else {
    score += 15 // unknown price: weak credit
  }

  // Rooms: full points at or above the minimum.
  if (listing.rooms != null) {
    if (Number(listing.rooms) >= Number(profile.rooms_min)) score += 20
    else if (Number(listing.rooms) >= Number(profile.rooms_min) - 0.5) score += 10
  } else {
    score += 8
  }

  // District preference: empty preference list means "anywhere in Berlin".
  if (preferredDistricts.size === 0) score += 15
  else if (listing.district_id && preferredDistricts.has(listing.district_id)) score += 25

  // Freshness: full points under 6h old, fading to 0 at 48h.
  const hours = (Date.now() - new Date(listing.first_seen_at).getTime()) / 3600000
  if (hours <= 6) score += 15
  else if (hours <= 48) score += Math.round(15 * (1 - (hours - 6) / 42))

  return Math.max(0, Math.min(100, score))
}

globalThis.handler = async (req, ctx) => {
  const profiles = await ctx.db.sql(
    'SELECT id, user_id, budget_max, rooms_min, district_ids FROM search_profiles WHERE is_active = true',
  )
  if (profiles.length === 0) return { ok: true, matched: 0, profiles: 0 }

  // Candidates: active listings first seen in the last 7 days.
  const listings = await ctx.db.sql(`
    SELECT id, district_id, price_warm, rooms, first_seen_at
    FROM listings
    WHERE is_active = true AND first_seen_at > now() - interval '7 days'
  `)

  let matched = 0
  for (const profile of profiles) {
    const districtIds = Array.isArray(profile.district_ids)
      ? profile.district_ids
      : JSON.parse(profile.district_ids || '[]')
    const preferred = new Set(districtIds)

    const existing = await ctx.db.sql(
      'SELECT listing_id FROM matches WHERE search_profile_id = $1',
      [profile.id],
    )
    const already = new Set(existing.map((m) => m.listing_id))

    for (const listing of listings) {
      if (already.has(listing.id)) continue
      const score = scoreListing(profile, listing, preferred)
      if (score < MIN_SCORE) continue
      await ctx.db.sql(
        `INSERT INTO matches (search_profile_id, listing_id, score) VALUES ($1, $2, $3)`,
        [profile.id, listing.id, score],
      )
      matched++
    }
  }

  ctx.log.info('match engine complete', { profiles: profiles.length, matched })
  return { ok: true, profiles: profiles.length, matched }
}
