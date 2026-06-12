// ingest-openimmo — the legitimate intake pipe. Agents / property managers /
// CRM software export listings as OpenImmo XML to all the portals; if they add
// Predwell as a "target", they POST the same package here and we receive the
// listing directly (often before the portals). source = 'openimmo'.
//
// Auth: the Eurobase gateway strips custom headers + the query string before
// proxying to the runner (only the body + Content-Type survive), so the feed
// key must ride INSIDE the OpenImmo XML. Partners set their transfer user
// (`<uebertragung benutzer="…">`) to their Predwell feed key, or add a
// `<predwell_feed_key>…</predwell_feed_key>` element. We sha256 it and match an
// active row in feed_keys. Body is OpenImmo XML (the runner sandbox has no XML
// parser, so we extract core fields with regex). ZIP+images is a later
// iteration; this MVP ingests the text fields + exact geo coordinates.
//#include _ingest-core.js

const SOURCE = 'openimmo'

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function sha256hex(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function tag(xml, name) {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'))
  return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : null
}

function deNum(v) {
  if (v == null) return null
  let s = String(v).trim().replace(/[^0-9.,-]/g, '')
  if (s === '') return null
  const dot = s.lastIndexOf('.')
  const comma = s.lastIndexOf(',')
  if (dot >= 0 && comma >= 0) s = comma > dot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')
  else if (comma >= 0) s = s.replace(',', '.')
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : null
}

// Parse each <immobilie> block into a canonical adapter row.
function parseOpenImmo(xml) {
  const rows = []
  const blocks = xml.split(/<immobilie[\s>]/i).slice(1)
  for (const raw of blocks) {
    const b = raw.slice(0, raw.search(/<\/immobilie>/i) + 1)
    const sourceId = tag(b, 'objektnr_extern') || tag(b, 'objektnr_intern')
    if (!sourceId) continue

    // geokoordinaten breitengrad="…" laengengrad="…" (attributes any order)
    const geo = b.match(/<geokoordinaten\b[^>]*>/i)?.[0] || ''
    const lat = deNum(geo.match(/breitengrad="([^"]+)"/i)?.[1])
    const lng = deNum(geo.match(/laengengrad="([^"]+)"/i)?.[1])

    const street = tag(b, 'strasse')
    const houseNo = tag(b, 'hausnummer')
    const plz = tag(b, 'plz')
    const ort = tag(b, 'ort') || 'Berlin'
    const districtRaw = tag(b, 'regionaler_zusatz') || tag(b, 'gemeinde') || ''
    const addressText = street
      ? `${street}${houseNo ? ' ' + houseNo : ''}, ${plz ? plz + ' ' : ''}${ort}`.replace(/\s+/g, ' ').trim()
      : null

    const verf = tag(b, 'verfuegbar_ab')
    const dm = String(verf || '').match(/(\d{2})\.(\d{2})\.(\d{4})/) || String(verf || '').match(/(\d{4})-(\d{2})-(\d{2})/)
    const availableFrom = dm
      ? dm[0].includes('.')
        ? `${dm[3]}-${dm[2]}-${dm[1]}`
        : dm[0]
      : null

    rows.push({
      sourceId: `oi-${sourceId}`,
      title: (tag(b, 'objekttitel') || tag(b, 'objekttitelangabe') || `${districtRaw || ort} Wohnung`).slice(0, 200),
      url: tag(b, 'objektadresse_freigeben') || null, // most feeds omit a public URL
      districtRaw,
      addressText,
      priceWarm: deNum(tag(b, 'warmmiete')),
      priceCold: deNum(tag(b, 'kaltmiete') || tag(b, 'nettokaltmiete')),
      sizeSqm: deNum(tag(b, 'wohnflaeche')),
      rooms: deNum(tag(b, 'anzahl_zimmer')),
      availableFrom,
      lat,
      lng,
    })
  }
  return rows
}

globalThis.handler = async (req, ctx) => {
  if (req.method !== 'POST') return jsonResponse({ error: 'POST an OpenImmo XML package' }, 405)

  const xml = await req.text()
  if (!xml) return jsonResponse({ error: 'empty body' }, 400)

  // Feed key from the XML (gateway strips headers/query — see header comment).
  const key =
    xml.match(/<uebertragung\b[^>]*\bbenutzer="([^"]+)"/i)?.[1] ||
    tag(xml, 'predwell_feed_key') ||
    ''
  if (!key) return jsonResponse({ error: 'missing feed key (set <uebertragung benutzer> or <predwell_feed_key>)' }, 401)
  const keyHash = await sha256hex(key)
  const feed = await ctx.db.sql('SELECT id, name FROM feed_keys WHERE key_hash = $1 AND active = true', [keyHash])
  if (feed.length === 0) return jsonResponse({ error: 'invalid feed key' }, 401)

  if (!/<immobilie/i.test(xml)) return jsonResponse({ error: 'no <immobilie> in body' }, 400)

  const rows = parseOpenImmo(xml)
  const districts = await ctx.db.sql('SELECT id, slug FROM districts')
  const districtBySlug = new Map(districts.map((d) => [d.slug, d]))
  const { inserted, refreshed } = await upsertListings(ctx, rows, districtBySlug, SOURCE)

  ctx.log.info('openimmo ingested', { feed: feed[0].name, parsed: rows.length, inserted, refreshed })
  return { ok: true, parsed: rows.length, inserted, refreshed }
}
