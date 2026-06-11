import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { District, Listing, Match } from '../lib/data'
import './MatchMap.css'

// EU-friendly OSM raster tiles. Swap this one URL for a self-hosted / EU tile
// provider in production to keep the stack fully EU-sovereign.
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const TILE_ATTR = '© OpenStreetMap contributors'
const BERLIN_CENTER: [number, number] = [52.52, 13.405]

interface Props {
  matches: Match[]
  listings: Map<string, Listing>
  districts: Map<string, District>
  openLabel: string
}

// Deterministic small offset so multiple pins that fall back to the same
// district centroid don't stack exactly on top of each other.
function jitter(id: string): [number, number] {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return [(((h % 100) / 100) - 0.5) * 0.012, ((((h >> 8) % 100) / 100) - 0.5) * 0.018]
}

// Pin placement fallback: exact listing coordinates → district centroid (jittered).
function position(listing: Listing, districts: Map<string, District>): [number, number] | null {
  if (listing.lat != null && listing.lng != null) return [Number(listing.lat), Number(listing.lng)]
  const d = listing.district_id ? districts.get(listing.district_id) : null
  if (d?.center_lat != null) {
    const [dlat, dlng] = jitter(listing.id)
    return [Number(d.center_lat) + dlat, Number(d.center_lng) + dlng]
  }
  return null
}

// Label fallback: full address (street/number) → district name.
function locationLabel(listing: Listing, districts: Map<string, District>): string {
  if (listing.address_text) return listing.address_text
  const d = listing.district_id ? districts.get(listing.district_id) : null
  return d?.name ?? 'Berlin'
}

function pinColor(score: number): string {
  if (score >= 85) return '#20382a' // forest — strong
  if (score >= 70) return '#f07a3e' // signal — good
  return '#a44720' // signal-dark — ok
}

export function MatchMap({ matches, listings, districts, openLabel }: Props) {
  const elRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)

  // Init once.
  useEffect(() => {
    if (!elRef.current || mapRef.current) return
    const map = L.map(elRef.current, { scrollWheelZoom: false, attributionControl: true }).setView(
      BERLIN_CENTER,
      11,
    )
    L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 19 }).addTo(map)
    layerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Re-render markers when matches/listings change.
  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return
    layer.clearLayers()
    const points: [number, number][] = []
    for (const m of matches) {
      const listing = listings.get(m.listing_id)
      if (!listing) continue
      const pos = position(listing, districts)
      if (!pos) continue
      points.push(pos)
      const marker = L.circleMarker(pos, {
        radius: 9,
        color: '#fffaf1',
        weight: 2,
        fillColor: pinColor(m.score),
        fillOpacity: 0.95,
      })
      const link = listing.url
        ? `<a href="${listing.url}" target="_blank" rel="noreferrer" style="color:#a44720;font-weight:700">${openLabel} →</a>`
        : ''
      marker.bindPopup(
        `<div style="font-family:ui-sans-serif,sans-serif;min-width:160px">
           <strong>${m.score}%</strong> · €${listing.price_warm ?? '—'}<br/>
           <span style="font-weight:600">${listing.title?.slice(0, 60) ?? ''}</span><br/>
           <span style="color:#647068">${locationLabel(listing, districts)}</span><br/>${link}
         </div>`,
      )
      layer.addLayer(marker)
    }
    if (points.length) map.fitBounds(points, { padding: [40, 40], maxZoom: 14 })
    else map.setView(BERLIN_CENTER, 11)
  }, [matches, listings, districts, openLabel])

  return <div className="match-map" ref={elRef} aria-label="Map of your matches" />
}
