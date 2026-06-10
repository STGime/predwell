#!/usr/bin/env node
// Populates geo_amenities from OpenStreetMap (Overpass) for Berlin. One bbox
// query per amenity type; idempotent per type (clears + reloads that type).
//
// Berlin amenities change slowly — run this occasionally (or monthly via cron),
// not every deploy. Honest User-Agent; Overpass is free but rate-limited.
//
// Usage: node scripts/sync-amenities.mjs [type ...]   (default: all types)

import { api } from './lib/admin.mjs'

// Berlin bounding box (south, west, north, east).
const BBOX = '52.33,13.08,52.68,13.77'
const UA = 'PredwellBot/0.1 (+https://predwell.eurobase.app; Berlin apartment search agent)'

// type → Overpass filter (rail-based access points for "transit").
const TYPES = {
  kita: '["amenity"="kindergarten"]',
  school: '["amenity"="school"]',
  park: '["leisure"="park"]',
  supermarket: '["shop"="supermarket"]',
  transit: '["railway"~"^(station|subway_entrance|tram_stop|halt)$"]',
}

async function overpass(filter) {
  const query = `[out:json][timeout:90];nwr${filter}(${BBOX});out center;`
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  })
  if (!res.ok) throw new Error(`Overpass ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = await res.json()
  return (data.elements || [])
    .map((e) => {
      const lat = e.lat ?? e.center?.lat
      const lng = e.lon ?? e.center?.lon
      if (lat == null || lng == null) return null
      return { osm_id: `${e.type}/${e.id}`, name: e.tags?.name ?? null, lat, lng }
    })
    .filter(Boolean)
}

async function inBatches(items, size, fn) {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(fn))
    process.stdout.write(`\r  ${Math.min(i + size, items.length)}/${items.length}`)
  }
  if (items.length) console.log()
}

const requested = process.argv.slice(2).filter((t) => TYPES[t])
const types = requested.length ? requested : Object.keys(TYPES)

for (const type of types) {
  console.log(`\n${type}: querying Overpass…`)
  const rows = await overpass(TYPES[type])
  console.log(`  ${rows.length} found`)

  // Clear existing rows of this type (idempotent reload).
  const existing = (await api.sql(`SELECT id FROM geo_amenities WHERE type = '${type}'`)).rows || []
  if (existing.length) {
    console.log(`  clearing ${existing.length} existing…`)
    await inBatches(existing, 16, (r) => api.remove('geo_amenities', r.id))
  }

  console.log('  inserting…')
  await inBatches(rows, 16, (r) =>
    api.insert('geo_amenities', { type, osm_id: r.osm_id, name: r.name, lat: r.lat, lng: r.lng }),
  )
}

const counts = await api.sql(`SELECT type, count(*) AS n FROM geo_amenities GROUP BY type ORDER BY type`)
console.log('\nDone:', counts.rows)
