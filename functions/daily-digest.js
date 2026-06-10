// daily-digest — one global Berlin market digest per day.
//
// Computes per-district week-over-week deltas from listing_history (pure SQL),
// asks Mistral for a short EN + DE market summary in the "Steglitz strong,
// Mitte slow over €X" voice, and upserts into digests (unique on date, so
// re-runs are idempotent). Email delivery is deferred — the row is stored and
// readable by the landing/dashboard.
//
// Deployed with verify_jwt=false; runs as the tenant func role. Degrades
// gracefully when MISTRAL_API_KEY is absent: stats are still computed and
// stored, prose is left null with a logged warning.

// --- Mistral (EU LLM) over plain fetch; the sandbox has no SDK/imports. ---
async function mistralChat(apiKey, messages, opts = {}) {
  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: opts.model || 'mistral-small-latest',
      messages,
      temperature: opts.temperature ?? 0.4,
      max_tokens: opts.maxTokens ?? 900,
      ...(opts.responseFormat ? { response_format: opts.responseFormat } : {}),
    }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(`Mistral ${res.status}: ${data.message || JSON.stringify(data).slice(0, 200)}`)
  }
  return { content: data.choices?.[0]?.message?.content ?? '', usage: data.usage }
}

function pct(now, prev) {
  if (prev == null || Number(prev) === 0) return null
  return Math.round(((Number(now) - Number(prev)) / Number(prev)) * 100)
}

globalThis.handler = async (req, ctx) => {
  // Week-over-week per-district aggregates: last 7 days vs the prior 7.
  const rows = await ctx.db.sql(`
    SELECT d.name,
      SUM(CASE WHEN h.date > CURRENT_DATE - 7 THEN h.new_listings ELSE 0 END) AS new_last7,
      SUM(CASE WHEN h.date <= CURRENT_DATE - 7 AND h.date > CURRENT_DATE - 14 THEN h.new_listings ELSE 0 END) AS new_prev7,
      AVG(CASE WHEN h.date > CURRENT_DATE - 7 THEN h.avg_price_warm END) AS price_last7,
      AVG(CASE WHEN h.date <= CURRENT_DATE - 7 AND h.date > CURRENT_DATE - 14 THEN h.avg_price_warm END) AS price_prev7,
      AVG(CASE WHEN h.date > CURRENT_DATE - 7 THEN h.median_hours_live END) AS hours_last7
    FROM districts d
    JOIN listing_history h ON h.district_id = d.id
    WHERE h.date > CURRENT_DATE - 14
    GROUP BY d.name
  `)

  const districts = rows
    .map((r) => ({
      name: r.name,
      new_last7: Number(r.new_last7),
      new_prev7: Number(r.new_prev7),
      supply_change_pct: pct(r.new_last7, r.new_prev7),
      avg_price_warm: r.price_last7 != null ? Math.round(Number(r.price_last7)) : null,
      price_change_pct: pct(r.price_last7, r.price_prev7),
      avg_hours_live: r.hours_last7 != null ? Math.round(Number(r.hours_last7)) : null,
    }))
    .sort((a, b) => (b.supply_change_pct ?? -999) - (a.supply_change_pct ?? -999))

  const stats = {
    generated_for: 'market',
    movers_up: districts.filter((d) => (d.supply_change_pct ?? 0) > 0).slice(0, 3),
    movers_down: [...districts].reverse().filter((d) => (d.supply_change_pct ?? 0) < 0).slice(0, 3),
    districts,
  }

  let bodyEn = null
  let bodyDe = null
  const apiKey = await ctx.vault.get('MISTRAL_API_KEY')
  if (apiKey) {
    const sys =
      'You are Predwell, a Berlin rental-market analyst. Given week-over-week district stats, ' +
      'write a tight, concrete market digest for renters. Name 2–4 districts with the most ' +
      'movement, cite real numbers (new listings up/down %, avg warm rent €, days-on-market), ' +
      'and end with one actionable line on where to act fast. No preamble, no markdown headers. ' +
      'Return JSON: {"en": "<2-4 sentences English>", "de": "<2-4 sentences German>"}.'
    try {
      const { content, usage } = await mistralChat(
        apiKey,
        [
          { role: 'system', content: sys },
          { role: 'user', content: JSON.stringify(stats) },
        ],
        { responseFormat: { type: 'json_object' }, maxTokens: 900 },
      )
      const parsed = JSON.parse(content)
      bodyEn = parsed.en ?? null
      bodyDe = parsed.de ?? null
      ctx.log.info('digest generated', { usage })
    } catch (err) {
      ctx.log.error('Mistral digest failed', { error: String(err) })
    }
  } else {
    ctx.log.warn('MISTRAL_API_KEY not set — storing stats without prose')
  }

  // Upsert today's digest (date is unique).
  const existing = await ctx.db.sql('SELECT id FROM digests WHERE date = CURRENT_DATE')
  if (existing.length > 0) {
    await ctx.db.sql(
      'UPDATE digests SET body_en = $2, body_de = $3, stats = $4 WHERE id = $1',
      [existing[0].id, bodyEn, bodyDe, JSON.stringify(stats)],
    )
  } else {
    await ctx.db.sql(
      `INSERT INTO digests (date, scope, body_en, body_de, stats)
       VALUES (CURRENT_DATE, 'market', $1, $2, $3)`,
      [bodyEn, bodyDe, JSON.stringify(stats)],
    )
  }

  ctx.log.info('daily digest stored', { hasProse: !!bodyEn })
  return { ok: true, hasProse: !!bodyEn, movers_up: stats.movers_up.length, movers_down: stats.movers_down.length, body_en: bodyEn }
}
