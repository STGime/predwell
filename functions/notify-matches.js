// notify-matches — instant alerts for fresh high-score matches.
//
// Finds alert-worthy matches (score >= threshold, real scraped listing with a
// URL, not yet notified), emails the user "act fast" via Scaleway Transactional
// Email (EU), and stamps notified_at so each match alerts exactly once. The
// match row itself is the stored alert — the dashboard already surfaces it live
// via realtime, so this works end-to-end even before email is configured
// (sends are skipped + logged when SCW_TEM_* secrets are absent).
//
// Deployed verify_jwt=false; runs as the tenant func role.

const ALERT_THRESHOLD = 70

// --- Scaleway Transactional Email (EU). No-ops without config. ---
async function sendEmail(ctx, { to, subject, text, html }) {
  const apiKey = await ctx.vault.get('SCW_TEM_API_KEY')
  const sender = await ctx.vault.get('SCW_TEM_SENDER')
  const projectId = await ctx.vault.get('SCW_TEM_PROJECT_ID')
  const region = (await ctx.vault.get('SCW_TEM_REGION')) || 'fr-par'
  if (!apiKey || !sender || !projectId) {
    ctx.log.warn('Scaleway TEM not configured — alert email skipped', { to, subject })
    return { sent: false, reason: 'not_configured' }
  }
  const res = await fetch(
    `https://api.scaleway.com/transactional-email/v1alpha1/regions/${region}/emails`,
    {
      method: 'POST',
      headers: { 'X-Auth-Token': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: { email: sender, name: 'Predwell' },
        to: [{ email: to }],
        subject,
        text,
        html: html || undefined,
        project_id: projectId,
      }),
    },
  )
  if (!res.ok) {
    const body = await res.text()
    ctx.log.error('Scaleway TEM send failed', { status: res.status, body: body.slice(0, 200) })
    return { sent: false, reason: `tem_${res.status}` }
  }
  return { sent: true }
}

function alertText(m) {
  const price = m.price_warm ? `€${Math.round(Number(m.price_warm))} warm` : 'price n/a'
  const rooms = m.rooms ? `${m.rooms} rooms` : ''
  const note = m.fit_note ? `\n${m.fit_note}` : ''
  return (
    `Opportunity just posted in ${m.district_name || 'Berlin'} — ${m.score}% match.\n\n` +
    `${m.title}\n${[rooms, price, m.size_sqm ? m.size_sqm + ' m²' : ''].filter(Boolean).join(' · ')}${note}\n\n` +
    `Act fast — listings like this go in hours:\n${m.url}\n\n— Predwell`
  )
}

globalThis.handler = async (req, ctx) => {
  // Email comes from search_profiles.email (denormalized at profile create
  // time): the func role cannot read the platform `users` table — its RLS
  // calls public.current_end_user_id(), which the role can't execute (#188).
  const rows = await ctx.db.sql(
    `SELECT m.id, m.score, m.fit_note,
            l.title, l.url, l.price_warm, l.rooms, l.size_sqm,
            d.name AS district_name,
            sp.email AS user_email, sp.notify_email
     FROM matches m
     JOIN listings l ON l.id = m.listing_id
     JOIN search_profiles sp ON sp.id = m.search_profile_id
     LEFT JOIN districts d ON d.id = l.district_id
     WHERE m.notified_at IS NULL
       AND m.score >= ${ALERT_THRESHOLD}
       AND l.is_active = true
       AND l.url IS NOT NULL
     ORDER BY m.matched_at DESC
     LIMIT 50`,
  )

  let sent = 0
  let stored = 0
  for (const m of rows) {
    if (m.user_email && m.notify_email !== false) {
      const result = await sendEmail(ctx, {
        to: m.user_email,
        subject: `Predwell: ${m.score}% match in ${m.district_name || 'Berlin'} — act fast`,
        text: alertText(m),
      })
      if (result.sent) sent++
    }
    // Stamp notified_at regardless: the dashboard already shows it live, and we
    // never want to re-alert the same match. (Email is the deferred bonus.)
    await ctx.db.sql('UPDATE matches SET notified_at = now() WHERE id = $1', [m.id])
    stored++
  }

  ctx.log.info('notify-matches complete', { candidates: rows.length, sent, stored })
  return { ok: true, candidates: rows.length, sent, stored }
}
