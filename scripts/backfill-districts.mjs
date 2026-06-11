#!/usr/bin/env node
// One-off: assign a district to existing listings that have none, by resolving
// the area from their WG-Gesucht URL with the same logic the scraper uses.

import { api } from './lib/admin.mjs'

const ALIASES = {
  kreuzkoelln: 'neukoelln', weiensee: 'weissensee', 'maerkisches-viertel': 'reinickendorf',
  bergmannkiez: 'kreuzberg', halensee: 'wilmersdorf', grunewald: 'wilmersdorf', westend: 'charlottenburg',
  hermsdorf: 'reinickendorf', wittenau: 'reinickendorf', rosenthal: 'pankow', buch: 'pankow',
  baumschulenweg: 'treptow', niederschoeneweide: 'treptow', oberschoeneweide: 'treptow',
  altglienicke: 'treptow', bohnsdorf: 'treptow', gruenau: 'koepenick', friedrichshagen: 'koepenick',
  friedrichsfelde: 'lichtenberg', mahlsdorf: 'hellersdorf', kaulsdorf: 'hellersdorf', biesdorf: 'marzahn',
  lankwitz: 'steglitz', lichtenrade: 'tempelhof', marienfelde: 'tempelhof', rudow: 'neukoelln',
  gropiusstadt: 'neukoelln', siemensstadt: 'spandau', hakenfelde: 'spandau', frohnau: 'reinickendorf',
}
const norm = (s) => s.toLowerCase().replaceAll('ä', 'ae').replaceAll('ö', 'oe').replaceAll('ü', 'ue').replaceAll('ß', 'ss')

function resolve(raw, known) {
  let s = norm(raw).replace(/^(alt|altstadt)-/, '')
  if (known.has(s)) return s
  let best = null
  for (const k of known) if ((s === k || s.includes(k) || k.includes(s)) && (!best || k.length > best.length)) best = k
  return best ?? ALIASES[s] ?? null
}

const districts = (await api.sql('SELECT id, slug FROM districts')).rows
const byslug = new Map(districts.map((d) => [d.slug, d.id]))
const known = new Set(byslug.keys())

const rows = (await api.sql("SELECT id, url FROM listings WHERE district_id IS NULL AND url IS NOT NULL")).rows
let mapped = 0
for (const r of rows) {
  const m = r.url.match(/-in-Berlin-([A-Za-zäöüÄÖÜß-]+)\.\d+\.html/)
  if (!m) continue
  const slug = resolve(m[1], known)
  if (!slug) continue
  await api.update('listings', r.id, { district_id: byslug.get(slug) })
  mapped++
  if (mapped % 25 === 0) process.stdout.write(`\r  ${mapped}`)
}
console.log(`\nbackfilled ${mapped} / ${rows.length} null-district listings`)
const still = (await api.sql('SELECT count(*) n FROM listings WHERE district_id IS NULL')).rows[0].n
console.log('still null:', still)
