// match-engine — scores fresh listings against active search profiles and
// inserts matches. Runs on a 5-minute schedule; also invocable manually.
//
// Scoring (0–100): budget fit 40 + rooms 20 + district preference 25 +
// freshness 15, then ± adjustments for the profile's feature/proximity wishes
// (clamped 0–100). Matches with score >= 50 are inserted. The
// (search_profile_id, listing_id) pair is deduplicated here — the DDL
// surface has no composite unique constraints.

const MIN_SCORE = 50

// Walking-distance thresholds (metres) for "close to" proximity wishes.
const PROXIMITY_THRESHOLD = { kita: 800, school: 800, park: 800, supermarket: 800, transit: 400 }
const FEATURE_BONUS_CAP = 12
const PROXIMITY_BONUS_CAP = 16

function asObj(v) {
  if (!v) return {}
  if (typeof v === 'string') {
    try {
      return JSON.parse(v)
    } catch {
      return {}
    }
  }
  return v
}

// Layer the profile's feature/proximity wishes onto the base score using the
// listing's enrichment flags + geo distances. Bonuses for satisfied wishes;
// penalties for hard violations (sublet / WBS / swap when not wanted).
function scoreAdjustments(profile, listing) {
  const crit = asObj(profile.features)
  const wantFeat = asObj(crit.features)
  const wantProx = asObj(crit.proximity)
  const enr = asObj(listing.enrichment)
  const geo = asObj(enr.geo)
  let adj = 0

  // Hard violations.
  if (wantFeat.no_temporary && enr.temporary) adj -= 25
  if (enr.swap_only) adj -= 40
  if (enr.requires_wbs && !wantFeat.wbs_ok) adj -= 15
  if (wantFeat.no_wg && enr.wg_suitable) adj -= 20

  // Feature satisfaction (parking/balcony/ebk/lift/garden/pets/furnished/WG).
  let featBonus = 0
  for (const k of ['parking', 'balcony', 'ebk', 'lift', 'garden', 'pets_ok', 'furnished']) {
    if (wantFeat[k] && enr[k]) featBonus += 4
  }
  if (wantFeat.unfurnished && enr.furnished === false) featBonus += 4
  if (wantFeat.wg && enr.wg_suitable) featBonus += 4
  adj += Math.min(FEATURE_BONUS_CAP, featBonus)

  // Proximity satisfaction.
  let proxBonus = 0
  for (const type of Object.keys(PROXIMITY_THRESHOLD)) {
    const wantedDist = geo[`${type}_m`]
    if (wantProx[type] && wantedDist != null && wantedDist <= PROXIMITY_THRESHOLD[type]) {
      proxBonus += 5
    }
  }
  adj += Math.min(PROXIMITY_BONUS_CAP, proxBonus)

  return adj
}

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

  score += scoreAdjustments(profile, listing)
  return Math.max(0, Math.min(100, score))
}

// Short-term / holiday / commercial lets are never what a long-term renter
// wants — exclude them outright by title (no enrichment needed).
const SHORT_TERM_RE =
  /übernachtung|ferienwohnung|ferienappartement|monteur|tagesmiete|boardinghouse|serviced|auf zeit|\/\s*nacht|pro nacht|per night|nightly/i

globalThis.handler = async (req, ctx) => {
  const profiles = await ctx.db.sql(
    'SELECT id, user_id, budget_max, rooms_min, district_ids, features FROM search_profiles WHERE is_active = true',
  )
  if (profiles.length === 0) return { ok: true, matched: 0, profiles: 0 }

  // Candidates: active listings first seen in the last 7 days, minus obvious
  // short-term/holiday lets.
  const listings = (
    await ctx.db.sql(`
      SELECT id, title, district_id, price_warm, rooms, first_seen_at, enrichment
      FROM listings
      WHERE is_active = true AND first_seen_at > now() - interval '7 days'
    `)
  ).filter((l) => !SHORT_TERM_RE.test(l.title || ''))

  let matched = 0
  let skipped = 0
  for (const profile of profiles) {
    const districtIds = Array.isArray(profile.district_ids)
      ? profile.district_ids
      : JSON.parse(profile.district_ids || '[]')
    const preferred = new Set(districtIds)
    const roomsMin = Number(profile.rooms_min)

    const existing = await ctx.db.sql(
      'SELECT listing_id FROM matches WHERE search_profile_id = $1',
      [profile.id],
    )
    const already = new Set(existing.map((m) => m.listing_id))

    for (const listing of listings) {
      if (already.has(listing.id)) continue

      // Hard filters on the explicit criteria (relevance):
      //  - rooms: a known room count below the minimum (half-room tolerance)
      //  - district: when the user picked districts, require a KNOWN district
      //    in that set — drops wrong-district AND ungeocoded listings.
      if (listing.rooms != null && Number(listing.rooms) < roomsMin - 0.5) continue
      if (preferred.size > 0 && (!listing.district_id || !preferred.has(listing.district_id))) continue

      const score = scoreListing(profile, listing, preferred)
      if (score < MIN_SCORE) {
        skipped++
        continue
      }
      await ctx.db.sql(
        `INSERT INTO matches (search_profile_id, listing_id, score) VALUES ($1, $2, $3)`,
        [profile.id, listing.id, score],
      )
      matched++
    }
  }

  ctx.log.info('match engine complete', { profiles: profiles.length, matched, skipped })
  return { ok: true, profiles: profiles.length, matched }
}
