import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { eb } from '../lib/eurobase'
import { useAuth } from '../lib/auth'
import { useI18n } from '../lib/i18n'
import { fetchDistricts } from '../lib/data'
import type { District } from '../lib/data'
import { SiteFooter, SiteHeader } from '../components/SiteChrome'
import './OnboardingPage.css'

export function OnboardingPage() {
  const { t } = useI18n()
  const { session } = useAuth()
  const navigate = useNavigate()
  const [districts, setDistricts] = useState<District[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [name, setName] = useState('')
  const [budget, setBudget] = useState('1400')
  const [rooms, setRooms] = useState('2')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetchDistricts().then(setDistricts)
  }, [])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!session) return
    setBusy(true)
    setError(null)
    const { error: insertError } = await eb.db.from('search_profiles').insert({
      user_id: session.user.id,
      email: session.user.email,
      name: name.trim() || t('onboarding.name.placeholder'),
      budget_max: parseInt(budget, 10) || 1400,
      rooms_min: parseFloat(rooms) || 1,
      district_ids: [...selected],
      is_active: true,
    })
    setBusy(false)
    if (insertError) {
      setError(insertError)
      return
    }
    navigate('/app')
  }

  return (
    <div className="shell">
      <SiteHeader />
      <main className="onboarding-main">
        <div className="panel onboarding-panel">
          <p className="eyebrow">{t('onboarding.eyebrow')}</p>
          <h2>{t('onboarding.title')}</h2>
          <form className="onboarding-form" onSubmit={submit}>
            <label>
              {t('onboarding.name')}
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('onboarding.name.placeholder')}
              />
            </label>
            <div className="field-grid">
              <label>
                {t('app.budgetMax')}
                <input
                  inputMode="numeric"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value.replace(/[^0-9]/g, ''))}
                />
              </label>
              <label>
                {t('app.roomsMin')}
                <select value={rooms} onChange={(e) => setRooms(e.target.value)}>
                  <option value="1">{t('report.rooms.1')}</option>
                  <option value="2">{t('report.rooms.2')}</option>
                  <option value="3">{t('report.rooms.3plus')}</option>
                </select>
              </label>
            </div>
            <span className="chips-label">{t('onboarding.districts')}</span>
            <div className="district-chips">
              {districts.map((d) => (
                <button
                  type="button"
                  key={d.id}
                  className={`chip${selected.has(d.id) ? ' is-selected' : ''}`}
                  onClick={() => toggle(d.id)}
                >
                  {d.name}
                </button>
              ))}
            </div>
            {error && <p className="form-note error-note">{error}</p>}
            <button className="button primary" type="submit" disabled={busy}>
              {busy ? t('loading') : t('onboarding.submit')}
            </button>
          </form>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
