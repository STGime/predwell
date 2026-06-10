// free-report — anonymous landing-page report + lead capture.
//
// POST { budget, bedrooms, areas, fingerprint }
//   → { runId, topDistricts: [{name, percent}], peak, monitoredFeeds }
//   → 429 if this fingerprint already ran its free report
// POST { action: "capture-lead", runId, email }
//   → { ok: true }
//
// Deployed with verify_jwt=false (anonymous access). Runs as the tenant
// func role; RLS on report_runs admits it via the service policy branch.

const MONITORED_FEEDS = 37

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

// Normalize a user-typed area name for matching against district slugs:
// lowercase, German umlauts to ASCII digraphs, spaces to hyphens.
function normalizeArea(s) {
  return s
    .toLowerCase()
    .trim()
    .replaceAll('ä', 'ae')
    .replaceAll('ö', 'oe')
    .replaceAll('ü', 'ue')
    .replaceAll('ß', 'ss')
    .replaceAll(/\s+/g, '-')
}

function parseBudget(raw) {
  const digits = String(raw || '').replace(/[^0-9]/g, '')
  const n = parseInt(digits, 10)
  if (!n || n < 100) return 1400
  return Math.min(n, 20000)
}

function parseRooms(raw) {
  const m = String(raw || '').match(/\d+/)
  return m ? Math.min(parseInt(m[0], 10), 6) : 2
}

globalThis.handler = async (req, ctx) => {
  if (req.method !== 'POST') return jsonResponse({ error: 'method not allowed' }, 405)

  let body
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'invalid JSON body' }, 400)
  }

  if (body.action === 'capture-lead') {
    const email = String(body.email || '').trim()
    const runId = String(body.runId || '').trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonResponse({ error: 'invalid email' }, 400)
    if (!/^[0-9a-f-]{36}$/.test(runId)) return jsonResponse({ error: 'invalid runId' }, 400)
    await ctx.db.sql('UPDATE report_runs SET email = $1 WHERE id = $2', [email, runId])
    ctx.log.info('lead captured', { runId })
    return { ok: true }
  }

  const fingerprint = String(body.fingerprint || '').trim()
  if (!fingerprint || fingerprint.length > 100) {
    return jsonResponse({ error: 'fingerprint required' }, 400)
  }

  const existing = await ctx.db.sql(
    'SELECT id FROM report_runs WHERE client_fingerprint = $1',
    [fingerprint],
  )
  if (existing.length > 0) {
    return jsonResponse({ error: 'free run already used' }, 429)
  }

  // Prefer the structured criteria parsed by the SmartSearch box; fall back to
  // the legacy budget/bedrooms/areas strings (and their regex parsing).
  const criteria = body.criteria && typeof body.criteria === 'object' ? body.criteria : null
  const budget = criteria && Number.isFinite(criteria.budget_max)
    ? criteria.budget_max
    : parseBudget(body.budget)
  const rooms = criteria && Number.isFinite(criteria.rooms_min)
    ? criteria.rooms_min
    : parseRooms(body.bedrooms)
  const areasRaw = String(body.areas || '').slice(0, 300)
  const queryText = criteria && criteria.query_text ? String(criteria.query_text).slice(0, 600) : null

  // District stats over the last 28 days of history.
  const districts = await ctx.db.sql(`
    SELECT d.id, d.name, d.slug, d.avg_rent_sqm, d.demand_score, d.listing_velocity_hours,
           COALESCE(avg(h.new_listings), 0) AS avg_new
    FROM districts d
    LEFT JOIN listing_history h ON h.district_id = d.id AND h.date > CURRENT_DATE - 28
    GROUP BY d.id, d.name, d.slug, d.avg_rent_sqm, d.demand_score, d.listing_velocity_hours
  `)
  if (districts.length === 0) return jsonResponse({ error: 'no market data yet' }, 503)

  // Preferred districts: explicit ids from the parser, else name-matched areas.
  const preferredIds = new Set(criteria && Array.isArray(criteria.district_ids) ? criteria.district_ids : [])
  const preferredSlugs = areasRaw.split(/[,;/]+/).map(normalizeArea).filter(Boolean)

  const maxNew = Math.max(...districts.map((d) => Number(d.avg_new)), 0.001)
  const scored = districts.map((d) => {
    // Estimated warm rent for the requested size in this district, mirroring
    // the sizing model used for seed listings.
    const estSqm = 28 + rooms * 22 + 9
    const estPrice = Number(d.avg_rent_sqm) * estSqm
    const affordability = Math.min(budget / estPrice, 1)
    const supply = Number(d.avg_new) / maxNew
    const preferred =
      preferredIds.has(d.id) ||
      preferredSlugs.some((slug) => d.slug.includes(slug) || slug.includes(d.slug))
    const percent = Math.max(
      35,
      Math.min(95, Math.round(38 + 32 * affordability + 18 * supply + (preferred ? 8 : 0))),
    )
    return { name: d.name, slug: d.slug, percent, preferred }
  })

  scored.sort((a, b) => (b.preferred ? 1 : 0) - (a.preferred ? 1 : 0) || b.percent - a.percent)
  const topDistricts = scored.slice(0, 3).map(({ name, percent }) => ({ name, percent }))

  // Which part of the week sees the most fresh supply?
  const peakRows = await ctx.db.sql(`
    SELECT EXTRACT(ISODOW FROM date)::int AS dow, avg(new_listings) AS avg_new
    FROM listing_history
    WHERE date > CURRENT_DATE - 56
    GROUP BY 1 ORDER BY avg_new DESC LIMIT 1
  `)
  const dow = peakRows.length ? Number(peakRows[0].dow) : 1
  const peak = dow <= 2 ? 'earlyWeek' : dow <= 5 ? 'midWeek' : 'weekend'

  const result = { topDistricts, peak, monitoredFeeds: MONITORED_FEEDS }
  const inserted = await ctx.db.sql(
    `INSERT INTO report_runs (budget, rooms, areas, result, client_fingerprint, query_text)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [budget, String(body.bedrooms || ''), areasRaw, JSON.stringify(result), fingerprint, queryText],
  )

  ctx.log.info('free report generated', { budget, rooms, areas: areasRaw })
  return { runId: inserted[0].id, topDistricts, peak, monitoredFeeds: MONITORED_FEEDS }
}
