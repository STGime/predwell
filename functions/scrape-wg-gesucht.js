// scrape-wg-gesucht — polls WG-Gesucht Berlin listing pages and upserts into
// listings. Runs on a 15-minute schedule; also invocable manually.
//
// Politeness: honest User-Agent, 1.2s between page fetches, first page of
// each category only, robots.txt-allowed paths only.
//
// The runner sandbox has no imports and no DOM parser, so cards are parsed
// with regexes against WG-Gesucht's stable card markup (class
// "wgg_card offer_list_item", data-id, title="Anzeige ansehen: ...").
//
// Source adapter convention: every source produces canonical adapter rows
// (see _ingest-core.js) and upserts via the shared upsertListings().
//#include _ingest-core.js

const USER_AGENT = 'PredwellBot/0.1 (+https://predwell.eurobase.app; Berlin apartment search agent)'
const SOURCE = 'wg_gesucht'

const PAGES = [
  // Wohnungen (whole apartments) and 1-Zimmer-Wohnungen, Berlin (city id 8), page 0.
  'https://www.wg-gesucht.de/wohnungen-in-Berlin.8.2.1.0.html',
  'https://www.wg-gesucht.de/1-zimmer-wohnungen-in-Berlin.8.1.1.0.html',
]

// Parse one search results page into adapter rows.
function parseWgGesucht(html) {
  const rows = []
  const chunks = html.split('class="wgg_card offer_list_item')
  for (let i = 1; i < chunks.length; i++) {
    const chunk = chunks[i].slice(0, 6000)
    const id = chunk.match(/data-id="(\d+)"/)?.[1]
    if (!id) continue
    const href = chunk.match(/href="(\/[a-z0-9-]*wohnungen-in-Berlin[^"]+\.html)"/i)?.[1]
    const title = chunk.match(/title="Anzeige ansehen: ([^"]+)"/)?.[1]
    if (!href || !title) continue

    // District from the detail URL: /wohnungen-in-Berlin-Prenzlauer-Berg.123.html
    const districtRaw = href.match(/-in-Berlin-([A-Za-zäöüÄÖÜß-]+)\.\d+\.html/)?.[1] ?? ''
    const priceWarm = chunk.match(/<b>\s*([\d.]+)\s*&euro;/)?.[1]?.replaceAll('.', '')
    const sizeSqm = chunk.match(/<b>\s*(\d+)\s*m&sup2;/)?.[1]
    const rooms =
      chunk.match(/(\d+(?:[.,]\d)?)-Zimmer-Wohnung/)?.[1]?.replace(',', '.') ??
      (href.includes('1-zimmer') ? '1' : null)
    const availableFrom = chunk.match(/(\d{2})\.(\d{2})\.(\d{4})/)
    // Street address is the trailing segment of the location line.
    const addressText = chunk
      .match(/\|\s*\n?\s*([^<|]{3,60})\s*<\/span>/)?.[1]
      ?.trim()

    rows.push({
      sourceId: `wg-${id}`,
      title: decodeEntities(title),
      url: `https://www.wg-gesucht.de${href}`,
      districtRaw,
      districtSlug: normalizeSlug(districtRaw),
      addressText: addressText ? `${decodeEntities(addressText)}, Berlin` : null,
      priceWarm: priceWarm ? Number(priceWarm) : null,
      sizeSqm: sizeSqm ? Number(sizeSqm) : null,
      rooms: rooms ? Number(rooms) : null,
      availableFrom: availableFrom ? `${availableFrom[3]}-${availableFrom[2]}-${availableFrom[1]}` : null,
    })
  }
  return rows
}

// Roll up today's per-district stats so forecasts use live data.
async function updateDailyHistory(ctx) {
  const stats = await ctx.db.sql(`
    SELECT district_id, count(*)::int AS new_listings, avg(price_warm) AS avg_price
    FROM listings
    WHERE district_id IS NOT NULL AND first_seen_at::date = CURRENT_DATE
    GROUP BY district_id
  `)
  for (const s of stats) {
    const existing = await ctx.db.sql(
      'SELECT id FROM listing_history WHERE district_id = $1 AND date = CURRENT_DATE',
      [s.district_id],
    )
    if (existing.length > 0) {
      await ctx.db.sql(
        'UPDATE listing_history SET new_listings = $2, avg_price_warm = $3 WHERE id = $1',
        [existing[0].id, s.new_listings, s.avg_price],
      )
    } else {
      await ctx.db.sql(
        `INSERT INTO listing_history (district_id, date, new_listings, avg_price_warm)
         VALUES ($1, CURRENT_DATE, $2, $3)`,
        [s.district_id, s.new_listings, s.avg_price],
      )
    }
  }
}

globalThis.handler = async (req, ctx) => {
  const state = await loadScrapeState(ctx, SOURCE)

  // Honor an active cooldown — skip the run entirely while blocked.
  if (state.blocked_until && new Date(state.blocked_until) > new Date()) {
    ctx.log.warn('scrape skipped — in backoff', { blockedUntil: state.blocked_until })
    return { ok: true, skipped: true, blockedUntil: state.blocked_until }
  }

  const districts = await ctx.db.sql('SELECT id, slug FROM districts')
  const districtBySlug = new Map(districts.map((d) => [d.slug, d]))

  let total = { inserted: 0, refreshed: 0, parsed: 0 }
  let blockedStatus = null
  let retryAfter = null

  for (const [i, page] of PAGES.entries()) {
    if (i > 0) await new Promise((resolve) => setTimeout(resolve, 1200))
    let res
    try {
      res = await fetch(page, { headers: { 'User-Agent': USER_AGENT } })
    } catch (err) {
      ctx.log.warn('page fetch threw', { page, error: String(err) })
      continue
    }

    // Block signals: stop the whole run and enter backoff.
    if (res.status === 429 || res.status === 403) {
      blockedStatus = res.status
      retryAfter = parseRetryAfter(res)
      ctx.log.warn('blocked by source', { page, status: res.status, retryAfter })
      break
    }
    if (!res.ok) {
      ctx.log.warn('page fetch failed', { page, status: res.status })
      continue
    }

    const rows = parseWgGesucht(await res.text())
    const { inserted, refreshed } = await upsertListings(ctx, rows, districtBySlug, SOURCE)
    total = {
      inserted: total.inserted + inserted,
      refreshed: total.refreshed + refreshed,
      parsed: total.parsed + rows.length,
    }
  }

  if (blockedStatus) {
    const failures = Number(state.consecutive_failures) + 1
    const secs = backoffSeconds(failures, retryAfter)
    const blockedUntil = new Date(Date.now() + secs * 1000).toISOString()
    await saveScrapeState(ctx, SOURCE, { failures, blockedUntil, status: String(blockedStatus) })
    ctx.log.warn('entering backoff', { failures, blockedUntil })
    return { ok: false, blocked: true, status: blockedStatus, blockedUntil, failures }
  }

  // Success — clear any prior backoff.
  await saveScrapeState(ctx, SOURCE, { failures: 0, blockedUntil: null, status: 'ok' })

  // Listings that have dropped off the feeds for 3+ days are gone.
  await ctx.db.sql(
    `UPDATE listings SET is_active = false
     WHERE source = 'wg_gesucht' AND is_active AND last_seen_at < now() - interval '3 days'`,
  )

  await updateDailyHistory(ctx)

  ctx.log.info('scrape complete', total)
  return { ok: true, ...total }
}
