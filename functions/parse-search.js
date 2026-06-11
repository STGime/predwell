// parse-search — turn a renter's free-text wish into structured criteria.
//
// POST { text } → { budget_max, rooms_min, district_ids[], district_slugs[],
//                   features{…}, proximity{…}, summary }
//
// The frontend calls this debounced-as-you-type to auto-fill the search
// controls. Mistral (ministral-8b — cheap, frequent calls) extracts intent;
// district IDs are resolved server-side against our own list (never trust a
// model-invented id). Deployed verify_jwt=false. Degrades to { error } when
// MISTRAL_API_KEY is absent so the frontend keeps its manual controls.

const FEATURE_KEYS = ['parking', 'balcony', 'ebk', 'furnished', 'unfurnished', 'lift', 'garden', 'pets_ok', 'wg', 'no_wg', 'no_temporary', 'wbs_ok']
const PROXIMITY_KEYS = ['kita', 'school', 'park', 'transit', 'supermarket']

async function mistralChat(apiKey, messages, opts = {}) {
  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: opts.model || 'ministral-8b-latest',
      messages,
      temperature: 0.1,
      max_tokens: 400,
      response_format: { type: 'json_object' },
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`Mistral ${res.status}: ${data.message || JSON.stringify(data).slice(0, 200)}`)
  return data.choices?.[0]?.message?.content ?? '{}'
}

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

globalThis.handler = async (req, ctx) => {
  if (req.method !== 'POST') return jsonResponse({ error: 'method not allowed' }, 405)
  let body
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'invalid JSON' }, 400)
  }
  const text = String(body.text || '').trim().slice(0, 600)
  if (!text) return jsonResponse({ error: 'text required' }, 400)

  const apiKey = await ctx.vault.get('MISTRAL_API_KEY')
  if (!apiKey) return jsonResponse({ error: 'parser unavailable' }, 503)

  const districts = await ctx.db.sql('SELECT id, name, slug FROM districts')
  const districtNames = districts.map((d) => d.name)

  const sys =
    'You extract structured rental-search criteria from a renter\'s free-text wish for Berlin. ' +
    'Return STRICT JSON with keys: ' +
    'budget_max (number|null — monthly warm rent ceiling in €), ' +
    'rooms_min (number|null — minimum rooms), ' +
    `districts (array of Berlin district names chosen ONLY from this list: ${districtNames.join(', ')}), ` +
    `features (object with boolean keys: ${FEATURE_KEYS.join(', ')} — ebk = fitted kitchen/Einbauküche; wg = wants a flat suitable for a shared flat (WG-geeignet); no_wg = does NOT want a shared flat / wants a private flat; no_temporary means they do NOT want a sublet/Zwischenmiete; wbs_ok means they have a WBS), ` +
    `proximity (object with boolean keys: ${PROXIMITY_KEYS.join(', ')} — true if they want to be near that; kita = daycare/Kindergarten, transit = U-Bahn/S-Bahn/tram/bus), ` +
    'summary (one short sentence echoing what you understood, in the same language as the input). ' +
    'Only set a boolean true when the text clearly asks for it; omit or false otherwise. Use null for unstated numbers.'

  let parsed
  try {
    parsed = JSON.parse(await mistralChat(apiKey, [
      { role: 'system', content: sys },
      { role: 'user', content: text },
    ]))
  } catch (err) {
    ctx.log.error('parse failed', { error: String(err) })
    return jsonResponse({ error: 'parse failed' }, 502)
  }

  // Resolve model-returned district names to our real ids (case-insensitive).
  const bySlugName = new Map()
  for (const d of districts) {
    bySlugName.set(d.name.toLowerCase(), d)
    bySlugName.set(d.slug, d)
  }
  const matchedDistricts = []
  for (const raw of Array.isArray(parsed.districts) ? parsed.districts : []) {
    const key = String(raw || '').toLowerCase().trim()
    const d = bySlugName.get(key)
    if (d && !matchedDistricts.find((m) => m.id === d.id)) matchedDistricts.push(d)
  }

  const pick = (obj, keys) => {
    const out = {}
    for (const k of keys) if (obj && obj[k] === true) out[k] = true
    return out
  }

  return jsonResponse({
    budget_max: Number.isFinite(parsed.budget_max) ? Math.round(parsed.budget_max) : null,
    rooms_min: Number.isFinite(parsed.rooms_min) ? parsed.rooms_min : null,
    district_ids: matchedDistricts.map((d) => d.id),
    district_slugs: matchedDistricts.map((d) => d.slug),
    features: pick(parsed.features, FEATURE_KEYS),
    proximity: pick(parsed.proximity, PROXIMITY_KEYS),
    summary: typeof parsed.summary === 'string' ? parsed.summary.slice(0, 200) : null,
  })
}
