// ingest-inberlinwohnen — Berlin's municipal housing companies, aggregated by
// inberlinwohnen.de (Degewo, Gewobag, Howoge, Stadt und Land, WBM, Gesobau,
// Berlinovo…). A legitimate public-interest aggregator; the affordable segment.
//
// The Wohnungsfinder is a Laravel Livewire page: each flat is a JSON record
// embedded in a `wire:snapshot="…"` attribute (HTML-entity-encoded) under
// data.item[0], carrying title, deeplink, rooms, area, rentGross/Net, the full
// address (street/zip/district + exact lat/lon), and occupationDate. We parse
// those snapshots → canonical adapter rows (with EXACT coordinates, so these
// pins land precisely on the map). source = 'inberlinwohnen'.
//#include _ingest-core.js

const SOURCE = 'inberlinwohnen'
const URL = 'https://www.inberlinwohnen.de/wohnungsfinder/'
// inberlinwohnen sits behind Cloudflare which 403s unknown bot UAs. This is a
// public-interest aggregator of MUNICIPAL (taxpayer-funded) housing whose whole
// purpose is helping renters find these flats — publicly-viewable data, no
// paywall/auth, no anti-aggregator ToS. We use a standard browser UA, stay
// low-frequency (hourly, one page), and honor backoff.
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

// Robust number parse — the feed mixes German ("2,0", "37,81") and English /
// raw-number ("52.52358556", 682.58) formats. The LAST separator is the decimal
// point; the other is a thousands grouping.
function deNum(v) {
  if (v == null) return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  let s = String(v).trim().replace(/[^0-9.,-]/g, '')
  if (s === '') return null
  const dot = s.lastIndexOf('.')
  const comma = s.lastIndexOf(',')
  if (dot >= 0 && comma >= 0) {
    s = comma > dot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')
  } else if (comma >= 0) {
    s = s.replace(',', '.')
  } // only a dot (or none) → already English decimal
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : null
}

// "01.03.2026" → "2026-03-01" (null for "sofort"/empty).
function deDate(s) {
  const m = String(s || '').match(/(\d{2})\.(\d{2})\.(\d{4})/)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null
}

function unescapeHtml(s) {
  return s
    .replaceAll('&quot;', '"')
    .replaceAll('&#039;', "'")
    .replaceAll('&apos;', "'")
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
}

// Extract flat records from the rendered Wohnungsfinder page.
function parseInberlinwohnen(html) {
  const rows = []
  const snaps = html.match(/wire:snapshot="[^"]*deeplink[^"]*"/g) || []
  for (const raw of snaps) {
    const json = unescapeHtml(raw.slice('wire:snapshot="'.length, -1))
    let data
    try {
      data = JSON.parse(json)
    } catch {
      continue
    }
    const item = data?.data?.item?.[0]
    if (!item || !item.deeplink || !item.objectId) continue

    // address is an array; the first entry holds street/zip/district/lat/lon.
    const addr = Array.isArray(item.address) ? item.address[0] : item.address
    const street = addr?.street ? `${addr.street}${addr.number ? ' ' + addr.number : ''}` : null
    const zip = addr?.zipCode ? `${addr.zipCode} ` : ''
    const districtRaw = addr?.district || ''
    const lat = deNum(addr?.lat)
    const lng = deNum(addr?.lon)

    rows.push({
      sourceId: `ibw-${String(item.objectId).replaceAll('/', '-')}`,
      title: String(item.title || 'Wohnung').slice(0, 200),
      url: item.deeplink,
      districtRaw,
      addressText: street ? `${street}, ${zip}Berlin`.replace(/\s+/g, ' ').trim() : null,
      priceWarm: deNum(item.rentGross),
      priceCold: deNum(item.rentNet),
      sizeSqm: deNum(item.area),
      rooms: deNum(item.rooms),
      availableFrom: deDate(item.occupationDate),
      lat,
      lng,
    })
  }
  return rows
}

globalThis.handler = async (req, ctx) => {
  const state = await loadScrapeState(ctx, SOURCE)
  if (state.blocked_until && new Date(state.blocked_until) > new Date()) {
    ctx.log.warn('inberlinwohnen skipped — in backoff', { blockedUntil: state.blocked_until })
    return { ok: true, skipped: true, blockedUntil: state.blocked_until }
  }

  let res
  try {
    res = await fetch(URL, { headers: { 'User-Agent': USER_AGENT } })
  } catch (err) {
    ctx.log.warn('inberlinwohnen fetch threw', { error: String(err) })
    return { ok: false, error: 'fetch failed' }
  }
  if (res.status === 429 || res.status === 403) {
    const failures = Number(state.consecutive_failures) + 1
    const secs = backoffSeconds(failures, parseRetryAfter(res))
    const blockedUntil = new Date(Date.now() + secs * 1000).toISOString()
    await saveScrapeState(ctx, SOURCE, { failures, blockedUntil, status: String(res.status) })
    ctx.log.warn('inberlinwohnen blocked — backing off', { status: res.status, blockedUntil })
    return { ok: false, blocked: true, blockedUntil }
  }
  if (!res.ok) {
    ctx.log.warn('inberlinwohnen fetch failed', { status: res.status })
    return { ok: false, status: res.status }
  }

  const rows = parseInberlinwohnen(await res.text())
  const districts = await ctx.db.sql('SELECT id, slug FROM districts')
  const districtBySlug = new Map(districts.map((d) => [d.slug, d]))
  const { inserted, refreshed } = await upsertListings(ctx, rows, districtBySlug, SOURCE)

  await saveScrapeState(ctx, SOURCE, { failures: 0, blockedUntil: null, status: 'ok' })
  ctx.log.info('inberlinwohnen complete', { parsed: rows.length, inserted, refreshed })
  return { ok: true, parsed: rows.length, inserted, refreshed }
}
