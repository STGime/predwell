import { useState } from 'react'
import { Link } from 'react-router-dom'
import { eb } from '../lib/eurobase'
import { useI18n } from '../lib/i18n'
import { AlertCard } from '../components/AlertCard'
import { SiteFooter, SiteHeader } from '../components/SiteChrome'
import './LandingPage.css'

const FREE_RUN_KEY = 'predwell_free_session_used'
const FINGERPRINT_KEY = 'predwell_fingerprint'

interface FreeReport {
  runId: string
  topDistricts: { name: string; percent: number }[]
  peak: 'earlyWeek' | 'midWeek' | 'weekend'
  monitoredFeeds: number
}

function fingerprint(): string {
  let fp = localStorage.getItem(FINGERPRINT_KEY)
  if (!fp) {
    fp = crypto.randomUUID()
    localStorage.setItem(FINGERPRINT_KEY, fp)
  }
  return fp
}

export function LandingPage() {
  const { t } = useI18n()
  const [usedFreeRun, setUsedFreeRun] = useState(() => localStorage.getItem(FREE_RUN_KEY) === 'true')
  const [running, setRunning] = useState(false)
  const [report, setReport] = useState<FreeReport | null>(null)
  const [reportInputs, setReportInputs] = useState<{ budget: string; bedrooms: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [leadEmail, setLeadEmail] = useState('')
  const [leadSaved, setLeadSaved] = useState(false)

  async function runReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (usedFreeRun || running) return

    const formData = new FormData(event.currentTarget)
    const budget = String(formData.get('budget') || '').trim() || '€1,400'
    const bedrooms = String(formData.get('bedrooms') || '2 rooms')
    const areas = String(formData.get('areas') || '').trim()

    setRunning(true)
    setError(null)
    const { data, error: fnError } = await eb.functions.invoke<FreeReport>('free-report', {
      body: { budget, bedrooms, areas, fingerprint: fingerprint() },
    })
    setRunning(false)

    if (fnError || !data) {
      // 429 = this fingerprint already used its free run; show the paywall.
      if (fnError?.status === 429) {
        localStorage.setItem(FREE_RUN_KEY, 'true')
        setUsedFreeRun(true)
        return
      }
      setError(t('error.generic'))
      return
    }

    setReport(data)
    setReportInputs({ budget, bedrooms })
    localStorage.setItem(FREE_RUN_KEY, 'true')
    setUsedFreeRun(true)
    document.querySelector('[data-report-result]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  async function captureLead(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!report || !leadEmail.trim()) return
    const { error: fnError } = await eb.functions.invoke('free-report', {
      body: { action: 'capture-lead', runId: report.runId, email: leadEmail.trim() },
    })
    if (!fnError) setLeadSaved(true)
  }

  const showPaywall = usedFreeRun && !running
  const districtNames = report?.topDistricts.map((d) => d.name) ?? []

  return (
    <div className="shell">
      <SiteHeader />

      <main className="landing-main">
        <section className="hero" aria-labelledby="hero-title">
          <div>
            <p className="eyebrow">{t('hero.eyebrow')}</p>
            <h1 id="hero-title">{t('hero.title')}</h1>
            <p className="lead">{t('hero.lead')}</p>

            <div className="hero-actions">
              {showPaywall ? (
                <Link className="button primary" to="/signup?intent=subscribe">
                  {t('paywall.cta')}
                </Link>
              ) : (
                <a className="button primary" href="#free-report">
                  {t('hero.cta.free')}
                </a>
              )}
              <a className="button secondary" href="#how-it-works">
                {t('hero.cta.how')}
              </a>
            </div>
            <p className="free-note">{t('hero.freeNote')}</p>
          </div>

          <AlertCard
            topline={t('alert.topline')}
            liveLabel={t('alert.live')}
            matchLabel={t('alert.match')}
            title={t('alert.title')}
            meta={t('alert.meta')}
            fitNote={t('alert.fit')}
            source={t('alert.source')}
            cta={t('alert.cta')}
            postedLabel={t('alert.posted')}
          />
        </section>

        <section className="trust-band" aria-label="Why Predwell">
          <div className="trust-item">
            <strong>{t('trust.fast')}</strong>
            <span>{t('trust.fast.sub')}</span>
          </div>
          <div className="trust-item">
            <strong>{t('trust.source')}</strong>
            <span>{t('trust.source.sub')}</span>
          </div>
          <div className="trust-item">
            <strong>{t('trust.eu')}</strong>
            <span>{t('trust.eu.sub')}</span>
          </div>
        </section>

        <section className="sections" id="how-it-works" aria-label="How Predwell works">
          <div className="panel">
            <h2>{t('how.title')}</h2>
            <p className="panel-copy">{t('how.copy')}</p>
          </div>

          <div className="panel">
            <ol className="steps">
              {([1, 2, 3] as const).map((n) => (
                <li key={n}>
                  <span className="number">{n}</span>
                  <div>
                    <strong>{t(`how.step${n}.title`)}</strong>
                    <p>{t(`how.step${n}.copy`)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="features" id="what-you-get" aria-label="What you get">
          <p className="eyebrow">{t('features.eyebrow')}</p>
          <h2 className="features-title">{t('features.title')}</h2>
          <div className="feature-grid">
            <div className="panel feature-card feature-primary">
              <span className="feature-label">{t('features.alerts.label')}</span>
              <strong className="feature-name">{t('features.alerts.title')}</strong>
              <p className="panel-copy">{t('features.alerts.copy')}</p>
              <p className="feature-example">{t('features.alerts.example')}</p>
            </div>
            <div className="panel feature-card">
              <span className="feature-label">{t('features.hood.label')}</span>
              <strong className="feature-name">{t('features.hood.title')}</strong>
              <p className="panel-copy">{t('features.hood.copy')}</p>
              <p className="feature-example">{t('features.hood.example')}</p>
            </div>
            <div className="panel feature-card">
              <span className="feature-label">{t('features.digest.label')}</span>
              <strong className="feature-name">{t('features.digest.title')}</strong>
              <p className="panel-copy">{t('features.digest.copy')}</p>
              <p className="feature-example">{t('features.digest.example')}</p>
            </div>
          </div>
        </section>

        <section className="sections" id="early-access" aria-label="Get your free apartment report">
          <div className="panel dark access">
            <div>
              <p className="eyebrow">{t('access.eyebrow')}</p>
              <h2>{t('access.title')}</h2>
              <p className="panel-copy">{t('access.copy')}</p>
            </div>
          </div>

          <div className="panel" id="free-report">
            <h2>{t('report.title')}</h2>
            <p className="panel-copy">{t('report.copy')}</p>

            {!showPaywall && (
              <form className="free-report" onSubmit={runReport}>
                <div className="field-grid">
                  <label>
                    {t('report.budget')}
                    <input name="budget" inputMode="numeric" placeholder="€1,400" autoComplete="off" />
                  </label>
                  <label>
                    {t('report.bedrooms')}
                    <select name="bedrooms" defaultValue="2 rooms">
                      <option value="1 room">{t('report.rooms.1')}</option>
                      <option value="2 rooms">{t('report.rooms.2')}</option>
                      <option value="3+ rooms">{t('report.rooms.3plus')}</option>
                    </select>
                  </label>
                </div>
                <label>
                  {t('report.areas')}
                  <input name="areas" placeholder={t('report.areas.placeholder')} autoComplete="off" />
                </label>
                <button className="button primary" type="submit" disabled={running}>
                  {running ? t('report.running') : t('report.submit')}
                </button>
                {error && <p className="form-note error-note">{error}</p>}
                <p className="form-note">{t('report.note')}</p>
              </form>
            )}

            {report && reportInputs && (
              <div className="report-result is-visible" data-report-result aria-live="polite">
                <h3>{t('report.ready')}</h3>
                <ul>
                  <li>
                    {t('report.line.match', {
                      districts: districtNames.join(', '),
                      bedrooms: reportInputs.bedrooms,
                      budget: reportInputs.budget,
                    })}
                  </li>
                  <li>{t('report.line.velocity', { peak: t(`report.peak.${report.peak}`) })}</li>
                  <li>{t('report.line.feeds', { count: report.monitoredFeeds })}</li>
                </ul>
                {leadSaved ? (
                  <p className="form-note lead-done">{t('lead.done')}</p>
                ) : (
                  <form className="lead-capture" onSubmit={captureLead}>
                    <label>
                      {t('lead.label')}
                      <div className="lead-row">
                        <input
                          type="email"
                          required
                          value={leadEmail}
                          onChange={(e) => setLeadEmail(e.target.value)}
                          placeholder={t('lead.placeholder')}
                        />
                        <button className="button mint" type="submit">
                          {t('lead.submit')}
                        </button>
                      </div>
                    </label>
                  </form>
                )}
              </div>
            )}

            {showPaywall && (
              <div className="paywall-message is-visible" aria-live="polite">
                <h3>{t('paywall.title')}</h3>
                <p className="form-note">{t('paywall.copy')}</p>
                <Link className="button primary" to="/signup?intent=subscribe">
                  {t('paywall.cta')}
                </Link>
              </div>
            )}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
