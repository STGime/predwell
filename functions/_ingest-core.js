// Shared ingestion core — prepended into each source function at deploy time
// via the `//#include _ingest-core.js` directive (the runner sandbox has no
// imports). Canonical adapter row shape produced by every source:
//   { sourceId, title, url, districtRaw, addressText, priceWarm, priceCold,
//     sizeSqm, rooms, availableFrom, lat, lng }
// upsertListings() writes them under the given `source`.

function normalizeSlug(s) {
  return String(s || '')
    .toLowerCase()
    .replaceAll('ä', 'ae')
    .replaceAll('ö', 'oe')
    .replaceAll('ü', 'ue')
    .replaceAll('ß', 'ss')
}

// Ortsteile and compound borough names → a known district slug.
const DISTRICT_ALIASES = {
  kreuzkoelln: 'neukoelln', weiensee: 'weissensee', 'maerkisches-viertel': 'reinickendorf',
  bergmannkiez: 'kreuzberg', halensee: 'wilmersdorf', grunewald: 'wilmersdorf', westend: 'charlottenburg',
  hermsdorf: 'reinickendorf', wittenau: 'reinickendorf', rosenthal: 'pankow', buch: 'pankow',
  baumschulenweg: 'treptow', niederschoeneweide: 'treptow', oberschoeneweide: 'treptow',
  altglienicke: 'treptow', bohnsdorf: 'treptow', gruenau: 'koepenick', friedrichshagen: 'koepenick',
  friedrichsfelde: 'lichtenberg', mahlsdorf: 'hellersdorf', kaulsdorf: 'hellersdorf', biesdorf: 'marzahn',
  lankwitz: 'steglitz', lichtenrade: 'tempelhof', marienfelde: 'tempelhof', rudow: 'neukoelln',
  gropiusstadt: 'neukoelln', siemensstadt: 'spandau', hakenfelde: 'spandau', frohnau: 'reinickendorf',
}

// exact → strip alt-/altstadt- prefix → longest known-slug substring → alias.
function resolveDistrictSlug(raw, knownSlugs) {
  let s = normalizeSlug(raw).replace(/^(alt|altstadt)-/, '')
  if (!s) return null
  if (knownSlugs.has(s)) return s
  let best = null
  for (const k of knownSlugs) {
    if ((s === k || s.includes(k) || k.includes(s)) && (!best || k.length > best.length)) best = k
  }
  if (best) return best
  return DISTRICT_ALIASES[s] ?? null
}

function decodeEntities(s) {
  return String(s || '')
    .replaceAll('&euro;', '€')
    .replaceAll('&sup2;', '²')
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#039;', "'")
    .trim()
}

// Upsert adapter rows for a given source. Dedup key is (source_id). On refresh
// it keeps price fresh and backfills district/coords if they were missing.
async function upsertListings(ctx, rows, districtBySlug, source) {
  let inserted = 0
  let refreshed = 0
  const knownSlugs = new Set(districtBySlug.keys())
  for (const row of rows) {
    const slug = resolveDistrictSlug(row.districtRaw || row.districtSlug || '', knownSlugs)
    const district = slug ? districtBySlug.get(slug) : null
    const existing = await ctx.db.sql('SELECT id FROM listings WHERE source_id = $1', [row.sourceId])
    if (existing.length > 0) {
      await ctx.db.sql(
        `UPDATE listings
           SET last_seen_at = now(), is_active = true,
               price_warm = COALESCE($2, price_warm),
               district_id = COALESCE(district_id, $3),
               lat = COALESCE(lat, $4), lng = COALESCE(lng, $5)
         WHERE id = $1`,
        [existing[0].id, row.priceWarm ?? null, district?.id ?? null, row.lat ?? null, row.lng ?? null],
      )
      refreshed++
    } else {
      await ctx.db.sql(
        `INSERT INTO listings
           (source, source_id, title, url, district_id, address_text, lat, lng,
            price_warm, price_cold, size_sqm, rooms, available_from, features)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, '{}')`,
        [
          source,
          row.sourceId,
          row.title,
          row.url,
          district?.id ?? null,
          row.addressText ?? null,
          row.lat ?? null,
          row.lng ?? null,
          row.priceWarm ?? null,
          row.priceCold ?? null,
          row.sizeSqm ?? null,
          row.rooms ?? null,
          row.availableFrom ?? null,
        ],
      )
      inserted++
    }
  }
  return { inserted, refreshed }
}

// --- scrape_state backoff (shared; keyed per source) ---
const MAX_BACKOFF_HOURS = 24

function backoffSeconds(failures, retryAfterSeconds) {
  const hours = Math.min(MAX_BACKOFF_HOURS, Math.pow(2, failures))
  const computed = hours * 3600
  return retryAfterSeconds && retryAfterSeconds > computed ? retryAfterSeconds : computed
}

function parseRetryAfter(res) {
  const header = res.headers.get('retry-after')
  if (!header) return null
  const secs = parseInt(header, 10)
  return Number.isFinite(secs) ? secs : null
}

async function loadScrapeState(ctx, source) {
  const rows = await ctx.db.sql(
    'SELECT consecutive_failures, blocked_until FROM scrape_state WHERE source = $1',
    [source],
  )
  return rows[0] ?? { consecutive_failures: 0, blocked_until: null }
}

async function saveScrapeState(ctx, source, patch) {
  const existing = await ctx.db.sql('SELECT id FROM scrape_state WHERE source = $1', [source])
  if (existing.length > 0) {
    await ctx.db.sql(
      `UPDATE scrape_state
       SET consecutive_failures = $2, blocked_until = $3, last_status = $4,
           last_run_at = now(), updated_at = now()
       WHERE source = $1`,
      [source, patch.failures, patch.blockedUntil, patch.status],
    )
  } else {
    await ctx.db.sql(
      `INSERT INTO scrape_state (source, consecutive_failures, blocked_until, last_status, last_run_at)
       VALUES ($1, $2, $3, $4, now())`,
      [source, patch.failures, patch.blockedUntil, patch.status],
    )
  }
}
