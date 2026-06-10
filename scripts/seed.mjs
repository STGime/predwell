#!/usr/bin/env node
// Seeds Berlin districts, 90 days of listing history, and ~60 seed listings
// via the service-role REST surface. Idempotent: each dataset is skipped if
// it is already present.
//
// Usage: node scripts/seed.mjs

import { api } from './lib/admin.mjs'

// [name, slug, lat, lng, avg_rent_sqm, velocity_hours, demand]
const DISTRICTS = [
  ['Mitte', 'mitte', 52.52, 13.405, 21.5, 3.2, 92],
  ['Prenzlauer Berg', 'prenzlauer-berg', 52.5429, 13.4243, 19.8, 3.8, 90],
  ['Friedrichshain', 'friedrichshain', 52.5158, 13.4548, 19.2, 4.2, 94],
  ['Kreuzberg', 'kreuzberg', 52.4973, 13.403, 19.5, 4.0, 93],
  ['Neukölln', 'neukoelln', 52.4811, 13.4358, 16.4, 5.5, 88],
  ['Wedding', 'wedding', 52.55, 13.355, 14.8, 8.5, 78],
  ['Moabit', 'moabit', 52.53, 13.342, 15.6, 9.0, 75],
  ['Charlottenburg', 'charlottenburg', 52.505, 13.304, 17.9, 10.5, 72],
  ['Schöneberg', 'schoeneberg', 52.4828, 13.357, 17.2, 8.0, 80],
  ['Tempelhof', 'tempelhof', 52.4667, 13.3857, 14.2, 12.0, 65],
  ['Lichtenberg', 'lichtenberg', 52.5156, 13.499, 13.1, 14.0, 60],
  ['Pankow', 'pankow', 52.5692, 13.4019, 14.5, 11.5, 68],
]

const STREETS = {
  mitte: ['Torstraße', 'Ackerstraße', 'Linienstraße'],
  'prenzlauer-berg': ['Stargarder Straße', 'Schönhauser Allee', 'Pappelallee'],
  friedrichshain: ['Boxhagener Straße', 'Rigaer Straße', 'Wühlischstraße'],
  kreuzberg: ['Graefestraße', 'Oranienstraße', 'Bergmannstraße'],
  neukoelln: ['Weserstraße', 'Sonnenallee', 'Karl-Marx-Straße'],
  wedding: ['Müllerstraße', 'Seestraße', 'Badstraße'],
  moabit: ['Turmstraße', 'Beusselstraße', 'Alt-Moabit'],
  charlottenburg: ['Kantstraße', 'Wilmersdorfer Straße', 'Schlossstraße'],
  schoeneberg: ['Akazienstraße', 'Hauptstraße', 'Goltzstraße'],
  tempelhof: ['Tempelhofer Damm', 'Manteuffelstraße', 'Friedrich-Karl-Straße'],
  lichtenberg: ['Frankfurter Allee', 'Weitlingstraße', 'Türrschmidtstraße'],
  pankow: ['Breite Straße', 'Florastraße', 'Wollankstraße'],
}

// Deterministic PRNG so seed data is stable across runs.
function mulberry32(a) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

async function insertAll(table, rows, concurrency = 12) {
  for (let i = 0; i < rows.length; i += concurrency) {
    await Promise.all(rows.slice(i, i + concurrency).map((row) => api.insert(table, row)))
    process.stdout.write(`\r  ${Math.min(i + concurrency, rows.length)}/${rows.length}`)
  }
  if (rows.length) console.log()
}

async function count(sql) {
  const res = await api.sql(sql)
  return Number(res.rows?.[0]?.n ?? 0)
}

// --- Districts ---
if ((await count('SELECT count(*) AS n FROM districts')) >= DISTRICTS.length) {
  console.log('Districts already seeded; skipping.')
} else {
  console.log('Seeding districts...')
  const existing = new Set(
    (await api.sql('SELECT slug FROM districts')).rows?.map((r) => r.slug) ?? [],
  )
  const rows = DISTRICTS.filter(([, slug]) => !existing.has(slug)).map(
    ([name, slug, lat, lng, rent, vel, demand]) => ({
      name,
      slug,
      center_lat: lat,
      center_lng: lng,
      avg_rent_sqm: rent,
      listing_velocity_hours: vel,
      demand_score: demand,
    }),
  )
  await insertAll('districts', rows)
}

const districtRows = (
  await api.sql('SELECT id, slug, avg_rent_sqm, listing_velocity_hours, demand_score FROM districts')
).rows

// --- Listing history (90 days per district) ---
if ((await count('SELECT count(*) AS n FROM listing_history')) > 0) {
  console.log('Listing history already seeded; skipping.')
} else {
  console.log('Seeding 90 days of listing history...')
  const rows = []
  const today = new Date()
  for (const d of districtRows) {
    const rand = mulberry32([...d.slug].reduce((a, c) => a + c.charCodeAt(0), 0))
    for (let daysAgo = 90; daysAgo >= 1; daysAgo--) {
      const date = new Date(today)
      date.setDate(date.getDate() - daysAgo)
      const base = Number(d.demand_score) / 18
      const weekendDip = date.getDay() === 0 || date.getDay() === 6 ? 0.6 : 1
      rows.push({
        district_id: d.id,
        date: date.toISOString().slice(0, 10),
        new_listings: Math.max(0, Math.round(base * weekendDip * (0.6 + rand() * 0.9))),
        avg_price_warm: Number((Number(d.avg_rent_sqm) * 62 * (0.92 + rand() * 0.16)).toFixed(2)),
        median_hours_live: Number((Number(d.listing_velocity_hours) * (0.7 + rand() * 0.6)).toFixed(1)),
      })
    }
  }
  await insertAll('listing_history', rows)
}

// --- Seed listings (5 per district) ---
if ((await count("SELECT count(*) AS n FROM listings WHERE source = 'seed'")) > 0) {
  console.log('Seed listings already present; skipping.')
} else {
  console.log('Seeding listings...')
  const rows = []
  let n = 0
  for (const d of districtRows) {
    const rand = mulberry32(1000 + [...d.slug].reduce((a, c) => a + c.charCodeAt(0), 0))
    const streets = STREETS[d.slug] ?? ['Hauptstraße']
    const name = DISTRICTS.find((x) => x[1] === d.slug)?.[0] ?? d.slug
    for (let k = 0; k < 5; k++) {
      n++
      const rooms = [1, 1.5, 2, 2, 2.5, 3, 3.5][Math.floor(rand() * 7)]
      const sqm = Math.round(28 + rooms * 22 + rand() * 18)
      const warm = Math.round(sqm * Number(d.avg_rent_sqm) * (0.88 + rand() * 0.24))
      const daysAgo = Math.floor(rand() * 14)
      const firstSeen = new Date(Date.now() - daysAgo * 86400_000).toISOString()
      rows.push({
        source: 'seed',
        source_id: `seed-${String(n).padStart(3, '0')}`,
        title: `${rooms}-Zimmer-Wohnung in ${name}, ${sqm} m²`,
        district_id: d.id,
        address_text: `${streets[k % streets.length]} ${3 + Math.floor(rand() * 110)}, Berlin`,
        price_warm: warm,
        price_cold: Math.round(warm * 0.78),
        size_sqm: sqm,
        rooms,
        features: { balcony: rand() > 0.5, altbau: rand() > 0.4, ebk: rand() > 0.5 },
        first_seen_at: firstSeen,
        last_seen_at: new Date().toISOString(),
        is_active: true,
      })
    }
  }
  await insertAll('listings', rows)
}

const summary = await api.sql(
  `SELECT (SELECT count(*) FROM districts) AS districts,
          (SELECT count(*) FROM listing_history) AS history,
          (SELECT count(*) FROM listings) AS listings`,
)
console.log('Done:', summary.rows[0])
