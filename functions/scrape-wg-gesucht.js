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
// Source adapter convention: every source produces rows
//   { sourceId, title, url, districtSlug, addressText, priceWarm, sizeSqm,
//     rooms, availableFrom }
// IS24 plugs in later as a second adapter producing the same shape.

const USER_AGENT = 'PredwellBot/0.1 (+https://predwell.eurobase.app; Berlin apartment search agent)'

const PAGES = [
  // Wohnungen (whole apartments) and 1-Zimmer-Wohnungen, Berlin (city id 8), page 0.
  'https://www.wg-gesucht.de/wohnungen-in-Berlin.8.2.1.0.html',
  'https://www.wg-gesucht.de/1-zimmer-wohnungen-in-Berlin.8.1.1.0.html',
]

function normalizeSlug(s) {
  return s
    .toLowerCase()
    .replaceAll('ä', 'ae')
    .replaceAll('ö', 'oe')
    .replaceAll('ü', 'ue')
    .replaceAll('ß', 'ss')
}

function decodeEntities(s) {
  return s
    .replaceAll('&euro;', '€')
    .replaceAll('&sup2;', '²')
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#039;', "'")
    .trim()
}

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

async function upsertListings(ctx, rows, districtBySlug) {
  let inserted = 0
  let refreshed = 0
  for (const row of rows) {
    // Match the WG-Gesucht district name against our slugs (e.g. URL slug
    // "neukoelln" or "prenzlauer-berg" both resolve directly).
    const district = districtBySlug.get(row.districtSlug) ?? null
    const existing = await ctx.db.sql('SELECT id FROM listings WHERE source_id = $1', [row.sourceId])
    if (existing.length > 0) {
      await ctx.db.sql(
        'UPDATE listings SET last_seen_at = now(), price_warm = $2, is_active = true WHERE id = $1',
        [existing[0].id, row.priceWarm],
      )
      refreshed++
    } else {
      await ctx.db.sql(
        `INSERT INTO listings
           (source, source_id, title, url, district_id, address_text, price_warm,
            size_sqm, rooms, available_from, features)
         VALUES ('wg_gesucht', $1, $2, $3, $4, $5, $6, $7, $8, $9, '{}')`,
        [
          row.sourceId,
          row.title,
          row.url,
          district?.id ?? null,
          row.addressText,
          row.priceWarm,
          row.sizeSqm,
          row.rooms,
          row.availableFrom,
        ],
      )
      inserted++
    }
  }
  return { inserted, refreshed }
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
  const districts = await ctx.db.sql('SELECT id, slug FROM districts')
  const districtBySlug = new Map(districts.map((d) => [d.slug, d]))

  let total = { inserted: 0, refreshed: 0, parsed: 0 }
  for (const [i, page] of PAGES.entries()) {
    if (i > 0) await new Promise((resolve) => setTimeout(resolve, 1200))
    const res = await fetch(page, { headers: { 'User-Agent': USER_AGENT } })
    if (!res.ok) {
      ctx.log.warn('page fetch failed', { page, status: res.status })
      continue
    }
    const rows = parseWgGesucht(await res.text())
    const { inserted, refreshed } = await upsertListings(ctx, rows, districtBySlug)
    total = {
      inserted: total.inserted + inserted,
      refreshed: total.refreshed + refreshed,
      parsed: total.parsed + rows.length,
    }
  }

  // Listings that have dropped off the feeds for 3+ days are gone.
  await ctx.db.sql(
    `UPDATE listings SET is_active = false
     WHERE source = 'wg_gesucht' AND is_active AND last_seen_at < now() - interval '3 days'`,
  )

  await updateDailyHistory(ctx)

  ctx.log.info('scrape complete', total)
  return { ok: true, ...total }
}
