// enrich-listings — Mistral classification of listings, two tiers.
//
//   Title pass : every active un-enriched listing, classified from its title +
//                structured fields. Cheap, no scraping. enrich_level='title'.
//   Detail pass: listings that already matched a profile and are only
//                title-enriched — fetch the detail page (backoff-aware, shares
//                the scrape_state cooldown with the scraper), classify from the
//                full German description. enrich_level='detail'.
//
// After (re)enriching, flags + a one-line fit_note are propagated to the
// listing's matches, and poor-fit flags (temporary / swap-only / WBS) down-rank
// the match score rather than deleting it (transparency).
//
// Deployed verify_jwt=false; runs as the tenant func role. Degrades to a no-op
// with a logged warning if MISTRAL_API_KEY is absent.

const SOURCE = 'wg_gesucht'
const TITLE_BATCH = 10
const DETAIL_BATCH = 5
const MAX_BACKOFF_HOURS = 24

async function mistralChat(apiKey, messages, opts = {}) {
  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: opts.model || 'mistral-small-latest',
      messages,
      temperature: opts.temperature ?? 0.2,
      max_tokens: opts.maxTokens ?? 400,
      response_format: { type: 'json_object' },
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`Mistral ${res.status}: ${data.message || JSON.stringify(data).slice(0, 200)}`)
  return data.choices?.[0]?.message?.content ?? '{}'
}

const CLASSIFY_SYS =
  'You classify German apartment listings for a Berlin rental search tool. ' +
  'From the provided text, return STRICT JSON with these keys: ' +
  'temporary (bool — Zwischenmiete/befristet/Nachmieter for a fixed term), ' +
  'requires_wbs (bool — WBS/Wohnberechtigungsschein needed), ' +
  'furnished (bool — möbliert/teilmöbliert), ' +
  'swap_only (bool — Tauschwohnung), ' +
  'cooperative (bool — Genossenschaft/Genossenschaftsanteile), ' +
  'commission_free (bool — provisionsfrei), ' +
  'parking (bool — Stellplatz/Garage/Tiefgarage/Parkplatz), ' +
  'balcony (bool — Balkon/Terrasse/Loggia), ' +
  'lift (bool — Aufzug/Fahrstuhl), ' +
  'garden (bool — Garten/Gartennutzung), ' +
  'pets_ok (bool — Haustiere erlaubt), ' +
  'deposit_months (number|null — Kaution in months if stated), ' +
  'fit_note (string — ONE short English sentence: the single most important thing a renter should know, e.g. "Furnished 6-month sublet" or "Standard unfurnished long-term let"). ' +
  'Base it only on the text; use false/null when unstated. No prose outside the JSON.'

async function classify(apiKey, listing, text) {
  const payload = {
    title: listing.title,
    rooms: listing.rooms,
    size_sqm: listing.size_sqm,
    price_warm: listing.price_warm,
    address: listing.address_text,
    text: text || null,
  }
  const raw = await mistralChat(apiKey, [
    { role: 'system', content: CLASSIFY_SYS },
    { role: 'user', content: JSON.stringify(payload) },
  ])
  let flags
  try {
    flags = JSON.parse(raw)
  } catch {
    flags = { fit_note: null }
  }
  return flags
}

// Pull the free-text description out of a WG-Gesucht detail page. The prose
// lives in <div id="freitext_0">; strip the embedded ad <script> + tags.
function extractDescription(html) {
  const i = html.indexOf('id="freitext_0"')
  if (i < 0) return null
  // Start after the opening tag closes so its attributes don't leak into the text.
  const start = html.indexOf('>', i)
  if (start < 0) return null
  let chunk = html.slice(start + 1, start + 1 + 6000)
  chunk = chunk.replace(/<script[\s\S]*?<\/script>/gi, ' ')
  chunk = chunk.replace(/<[^>]+>/g, ' ')
  chunk = chunk
    .replace(/&euro;/g, '€')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&[a-z]+;/g, ' ')
  return chunk.replace(/\s+/g, ' ').trim().slice(0, 1500) || null
}

// WG-Gesucht detail pages embed the map point as `lat":52.x` / `lng":13.x`.
// Constrain to Berlin's coordinate ranges to avoid false matches.
function extractCoords(html) {
  const lat = html.match(/lat"\s*:\s*"?(5[12]\.\d{3,})/)?.[1]
  const lng = html.match(/lng"\s*:\s*"?(1[34]\.\d{3,})/)?.[1]
  if (!lat || !lng) return null
  return { lat: Number(lat), lng: Number(lng) }
}

const AMENITY_TYPES = ['kita', 'school', 'park', 'transit', 'supermarket']

function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

// Nearest amenity (metres) per type, from geo_amenities within a ~1.5 km box.
// Pure bbox SQL + JS haversine — no PostGIS dependency.
async function computeGeoDistances(ctx, lat, lng) {
  const d = 0.012 // ~1.3 km lat / ~0.8 km lng box — covers the ≤800 m thresholds
  const rows = await ctx.db.sql(
    `SELECT type, lat, lng FROM geo_amenities
     WHERE lat BETWEEN $1 AND $2 AND lng BETWEEN $3 AND $4`,
    [lat - d, lat + d, lng - d, lng + d],
  )
  const geo = {}
  for (const type of AMENITY_TYPES) {
    let best = null
    for (const a of rows) {
      if (a.type !== type) continue
      const m = haversineM(lat, lng, Number(a.lat), Number(a.lng))
      if (best === null || m < best) best = m
    }
    geo[`${type}_m`] = best
  }
  return geo
}

// Down-rank (don't delete) matches the flags reveal as poor fits.
function scorePenalty(flags) {
  let p = 0
  if (flags.temporary) p += 25
  if (flags.swap_only) p += 40
  if (flags.requires_wbs) p += 20
  return p
}

async function propagateToMatches(ctx, listingId, flags) {
  const matches = await ctx.db.sql('SELECT id, score FROM matches WHERE listing_id = $1', [listingId])
  if (matches.length === 0) return
  const penalty = scorePenalty(flags)
  const note = flags.fit_note ?? null
  for (const m of matches) {
    const newScore = Math.max(0, Number(m.score) - penalty)
    await ctx.db.sql('UPDATE matches SET flags = $2, fit_note = $3, score = $4 WHERE id = $1', [
      m.id,
      JSON.stringify(flags),
      note,
      newScore,
    ])
  }
}

// --- shared scrape_state backoff (mirrors scrape-wg-gesucht.js) ---
async function loadState(ctx) {
  const rows = await ctx.db.sql(
    'SELECT consecutive_failures, blocked_until FROM scrape_state WHERE source = $1',
    [SOURCE],
  )
  return rows[0] ?? { consecutive_failures: 0, blocked_until: null }
}

async function enterBackoff(ctx, state, retryAfterSeconds) {
  const failures = Number(state.consecutive_failures) + 1
  const hours = Math.min(MAX_BACKOFF_HOURS, Math.pow(2, failures))
  const secs = retryAfterSeconds && retryAfterSeconds > hours * 3600 ? retryAfterSeconds : hours * 3600
  const blockedUntil = new Date(Date.now() + secs * 1000).toISOString()
  const existing = await ctx.db.sql('SELECT id FROM scrape_state WHERE source = $1', [SOURCE])
  if (existing.length > 0) {
    await ctx.db.sql(
      'UPDATE scrape_state SET consecutive_failures = $2, blocked_until = $3, last_status = $4, updated_at = now() WHERE source = $1',
      [SOURCE, failures, blockedUntil, 'enrich-block'],
    )
  } else {
    await ctx.db.sql(
      "INSERT INTO scrape_state (source, consecutive_failures, blocked_until, last_status) VALUES ($1, $2, $3, 'enrich-block')",
      [SOURCE, failures, blockedUntil],
    )
  }
  return blockedUntil
}

globalThis.handler = async (req, ctx) => {
  const apiKey = await ctx.vault.get('MISTRAL_API_KEY')
  if (!apiKey) {
    ctx.log.warn('MISTRAL_API_KEY not set — enrichment is a no-op')
    return { ok: true, skipped: 'no MISTRAL_API_KEY' }
  }

  let titleEnriched = 0
  let detailEnriched = 0

  // --- Title pass: all active, un-enriched listings (no network). ---
  const titleRows = await ctx.db.sql(
    `SELECT id, title, rooms, size_sqm, price_warm, address_text
     FROM listings WHERE is_active = true AND enriched_at IS NULL
     ORDER BY first_seen_at DESC LIMIT ${TITLE_BATCH}`,
  )
  const titleResults = await Promise.all(
    titleRows.map((l) =>
      classify(apiKey, l, null)
        .then((flags) => ({ l, flags }))
        .catch((err) => {
          ctx.log.error('title classify failed', { id: l.id, error: String(err) })
          return null
        }),
    ),
  )
  for (const r of titleResults) {
    if (!r) continue
    await ctx.db.sql(
      "UPDATE listings SET enrichment = $2, enriched_at = now(), enrich_level = 'title' WHERE id = $1",
      [r.l.id, JSON.stringify(r.flags)],
    )
    await propagateToMatches(ctx, r.l.id, r.flags)
    titleEnriched++
  }

  // --- Detail pass: matched listings, title-enriched only, backoff-aware. ---
  const state = await loadState(ctx)
  const blocked = state.blocked_until && new Date(state.blocked_until) > new Date()
  if (blocked) {
    ctx.log.warn('detail pass skipped — in backoff', { blockedUntil: state.blocked_until })
  } else {
    const detailRows = await ctx.db.sql(
      `SELECT l.id, l.url, l.title, l.rooms, l.size_sqm, l.price_warm, l.address_text
       FROM listings l
       WHERE l.is_active = true AND l.enrich_level = 'title' AND l.url IS NOT NULL
         AND EXISTS (SELECT 1 FROM matches m WHERE m.listing_id = l.id)
       ORDER BY l.first_seen_at DESC LIMIT ${DETAIL_BATCH}`,
    )
    for (const [i, l] of detailRows.entries()) {
      if (i > 0) await new Promise((r) => setTimeout(r, 1200))
      let res
      try {
        res = await fetch(l.url, {
          headers: { 'User-Agent': 'PredwellBot/0.1 (+https://predwell.eurobase.app; Berlin apartment search agent)' },
        })
      } catch (err) {
        ctx.log.warn('detail fetch threw', { id: l.id, error: String(err) })
        continue
      }
      if (res.status === 429 || res.status === 403) {
        const ra = parseInt(res.headers.get('retry-after') || '', 10)
        const until = await enterBackoff(ctx, state, Number.isFinite(ra) ? ra : null)
        ctx.log.warn('detail pass blocked — backing off', { status: res.status, until })
        break
      }
      if (!res.ok) {
        ctx.log.warn('detail fetch failed', { id: l.id, status: res.status })
        continue
      }
      const html = await res.text()
      const description = extractDescription(html)
      const coords = extractCoords(html)
      try {
        const flags = await classify(apiKey, l, description)
        // Geo: extract coords from the page, compute nearest-amenity distances.
        if (coords) {
          flags.geo = await computeGeoDistances(ctx, coords.lat, coords.lng)
          await ctx.db.sql(
            'UPDATE listings SET lat = $2, lng = $3, geocoded_at = now() WHERE id = $1',
            [l.id, coords.lat, coords.lng],
          )
        }
        await ctx.db.sql(
          "UPDATE listings SET enrichment = $2, enriched_at = now(), enrich_level = 'detail' WHERE id = $1",
          [l.id, JSON.stringify(flags)],
        )
        await propagateToMatches(ctx, l.id, flags)
        detailEnriched++
      } catch (err) {
        ctx.log.error('detail classify failed', { id: l.id, error: String(err) })
      }
    }
  }

  ctx.log.info('enrichment complete', { titleEnriched, detailEnriched })
  return { ok: true, titleEnriched, detailEnriched }
}
