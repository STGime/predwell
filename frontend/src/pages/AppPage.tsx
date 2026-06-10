import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { eb } from '../lib/eurobase'
import { useAuth } from '../lib/auth'
import { useI18n } from '../lib/i18n'
import type { TranslationKey } from '../lib/i18n'
import {
  DISPLAY_FLAGS,
  MATCH_STATUSES,
  fetchDistricts,
  fetchListingsByIds,
  fetchMatches,
  fetchProfiles,
  fetchSubscription,
  profileLimit,
} from '../lib/data'
import type { District, Listing, Match, MatchStatus, SearchProfile, Subscription } from '../lib/data'
import { ForecastMap } from '../components/ForecastMap'
import { LangToggle } from '../components/SiteChrome'
import './AppPage.css'

function relativeTime(iso: string, lang: string): string {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'always' })
  if (minutes < 60) return rtf.format(-minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (hours < 48) return rtf.format(-hours, 'hour')
  return rtf.format(-Math.round(hours / 24), 'day')
}

export function AppPage() {
  const { t, lang } = useI18n()
  const { session } = useAuth()
  const navigate = useNavigate()

  const [profiles, setProfiles] = useState<SearchProfile[]>([])
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [listings, setListings] = useState<Map<string, Listing>>(new Map())
  const [districts, setDistricts] = useState<District[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loaded, setLoaded] = useState(false)

  const reload = useCallback(async () => {
    const [profileRows, districtRows, sub] = await Promise.all([
      fetchProfiles(),
      fetchDistricts(),
      fetchSubscription(),
    ])
    setProfiles(profileRows)
    setDistricts(districtRows)
    setSubscription(sub)
    if (profileRows.length === 0) {
      navigate('/onboarding')
      return
    }
    const matchRows = await fetchMatches(profileRows.map((p) => p.id))
    setMatches(matchRows)
    setListings(await fetchListingsByIds([...new Set(matchRows.map((m) => m.listing_id))]))
    setLoaded(true)
  }, [navigate])

  useEffect(() => {
    reload()
  }, [reload])

  // Live feed: new matches arrive via realtime as the engine inserts them.
  useEffect(() => {
    const sub = eb.realtime.on('matches', 'INSERT', () => {
      reload()
    })
    return () => eb.realtime.off(sub)
  }, [reload])

  const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? profiles[0] ?? null
  const visibleMatches = useMemo(
    () => matches.filter((m) => activeProfile && m.search_profile_id === activeProfile.id),
    [matches, activeProfile],
  )

  const districtById = useMemo(() => new Map(districts.map((d) => [d.id, d])), [districts])

  // District outlook: demand-weighted forecast pins for the top districts.
  const outlook = useMemo(() => {
    const top = [...districts].sort((a, b) => b.demand_score - a.demand_score).slice(0, 2)
    return top.map((d, i) => ({
      percent: Math.min(95, Math.round(Number(d.demand_score) * 0.9)),
      top: i === 0 ? '42%' : '16%',
      left: i === 0 ? '43%' : undefined,
      right: i === 0 ? undefined : '20%',
      secondary: i > 0,
      name: d.name,
    }))
  }, [districts])

  async function setStatus(match: Match, status: MatchStatus) {
    setMatches((prev) => prev.map((m) => (m.id === match.id ? { ...m, status } : m)))
    await eb.db.from('matches').update(match.id, { status })
  }

  async function signOut() {
    await eb.auth.signOut()
    navigate('/')
  }

  if (!session) return null

  return (
    <div className="shell">
      <header className="site-header" aria-label="Predwell app header">
        <Link to="/" className="brand">
          <span className="brand-mark">P</span>
          <span>Predwell</span>
        </Link>
        <div className="header-right">
          <Link className="nav-note" to="/app/settings">
            {t('app.settings')}
          </Link>
          <LangToggle />
          <button className="nav-note logout-button" onClick={signOut}>
            {t('app.logout')}
          </button>
        </div>
      </header>

      <main className="app-main">
        <section className="app-columns">
          <div className="feed-column">
            <div className="feed-head">
              <h2>{t('app.matches')}</h2>
              <div className="profile-tabs">
                {profiles.map((p) => (
                  <button
                    key={p.id}
                    className={`chip${activeProfile?.id === p.id ? ' is-selected' : ''}`}
                    onClick={() => setActiveProfileId(p.id)}
                  >
                    {p.name}
                  </button>
                ))}
                {profiles.length < profileLimit(subscription) && (
                  <Link className="chip chip-add" to="/app/profiles/new">
                    + {t('app.newProfile')}
                  </Link>
                )}
              </div>
            </div>

            {activeProfile && (
              <p className="form-note profile-summary">
                ≤ €{activeProfile.budget_max} · ≥ {activeProfile.rooms_min}{' '}
                {t('report.bedrooms').toLowerCase()} ·{' '}
                <Link to={`/app/profiles/${activeProfile.id}`}>{t('app.editProfile')}</Link>
              </p>
            )}

            {loaded && visibleMatches.length === 0 && (
              <div className="panel empty-panel">
                <p className="panel-copy">{t('app.matches.empty')}</p>
              </div>
            )}

            <ul className="match-list">
              {visibleMatches.map((m) => {
                const listing = listings.get(m.listing_id)
                if (!listing) return null
                const district = listing.district_id ? districtById.get(listing.district_id) : null
                return (
                  <li className="match-card" key={m.id}>
                    <div className="match-score" aria-label={`${m.score}% ${t('app.score')}`}>
                      {m.score}%
                    </div>
                    <div className="match-body">
                      <strong>{listing.title}</strong>
                      <p className="form-note">
                        {district?.name ?? '—'} · €{listing.price_warm} · {listing.rooms}{' '}
                        {t('report.bedrooms').toLowerCase()} · {listing.size_sqm} m²
                      </p>
                      <p className="form-note match-meta">
                        {t('app.firstSeen', { time: relativeTime(listing.first_seen_at, lang) })}
                        {listing.url && (
                          <>
                            {' · '}
                            <a href={listing.url} target="_blank" rel="noreferrer">
                              {t('app.openListing')} →
                            </a>
                          </>
                        )}
                      </p>
                      {m.flags && (
                        <div className="match-flags">
                          {DISPLAY_FLAGS.filter((f) => m.flags?.[f]).map((f) => (
                            <span
                              key={f}
                              className={`flag-chip${f === 'temporary' || f === 'swap_only' || f === 'requires_wbs' ? ' flag-warn' : ''}`}
                            >
                              {t(`flag.${f}` as TranslationKey)}
                            </span>
                          ))}
                        </div>
                      )}
                      {m.fit_note && <p className="match-fit-note">{m.fit_note}</p>}
                    </div>
                    <select
                      className={`status-select status-${m.status}`}
                      value={m.status}
                      onChange={(e) => setStatus(m, e.target.value as MatchStatus)}
                    >
                      {MATCH_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {t(`app.status.${s}` as TranslationKey)}
                        </option>
                      ))}
                    </select>
                  </li>
                )
              })}
            </ul>
          </div>

          <aside className="outlook-column">
            <h2>{t('app.outlook')}</h2>
            <ForecastMap
              toplineLeft={t('forecast.topline.left')}
              toplineRight={t('forecast.topline.right')}
              districts={outlook.map((o, i) => ({
                name: o.name,
                top: i === 0 ? '18%' : undefined,
                bottom: i === 0 ? undefined : '16%',
                left: i === 0 ? '11%' : '16%',
              }))}
              pins={outlook.map(({ percent, top, left, right, secondary }) => ({
                percent,
                top,
                left,
                right,
                secondary,
              }))}
              metrics={[
                { value: '14d', label: t('forecast.metric.window') },
                { value: '37', label: t('forecast.metric.feeds') },
                { value: '1st', label: t('forecast.metric.contact') },
              ]}
            />
          </aside>
        </section>
      </main>
    </div>
  )
}
