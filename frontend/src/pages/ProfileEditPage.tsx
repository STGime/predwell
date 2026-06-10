import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { eb } from '../lib/eurobase'
import { useAuth } from '../lib/auth'
import { useI18n } from '../lib/i18n'
import { fetchDistricts, fetchProfiles, fetchSubscription, profileLimit } from '../lib/data'
import type { District } from '../lib/data'
import { SiteFooter, SiteHeader } from '../components/SiteChrome'
import './OnboardingPage.css'

export function ProfileEditPage() {
  const { t } = useI18n()
  const { session } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams()
  const isNew = id === 'new'

  const [districts, setDistricts] = useState<District[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [name, setName] = useState('')
  const [budget, setBudget] = useState('1400')
  const [rooms, setRooms] = useState('2')
  const [isActive, setIsActive] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    async function load() {
      const [districtRows, profiles, sub] = await Promise.all([
        fetchDistricts(),
        fetchProfiles(),
        fetchSubscription(),
      ])
      setDistricts(districtRows)
      if (isNew) {
        if (profiles.length >= profileLimit(sub)) navigate('/app/settings')
        return
      }
      const profile = profiles.find((p) => p.id === id)
      if (!profile) {
        navigate('/app')
        return
      }
      setName(profile.name)
      setBudget(String(profile.budget_max))
      setRooms(String(profile.rooms_min))
      setSelected(new Set(profile.district_ids ?? []))
      setIsActive(profile.is_active)
    }
    load()
  }, [id, isNew, navigate])

  function toggle(districtId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(districtId)) next.delete(districtId)
      else next.add(districtId)
      return next
    })
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!session) return
    setBusy(true)
    setError(null)
    const payload = {
      name: name.trim() || t('onboarding.name.placeholder'),
      budget_max: parseInt(budget, 10) || 1400,
      rooms_min: parseFloat(rooms) || 1,
      district_ids: [...selected],
      is_active: isActive,
    }
    const { error: dbError } = isNew
      ? await eb.db.from('search_profiles').insert({ ...payload, user_id: session.user.id })
      : await eb.db.from('search_profiles').update(id!, payload)
    setBusy(false)
    if (dbError) {
      setError(dbError)
      return
    }
    navigate('/app')
  }

  async function remove() {
    if (isNew || !id) return
    await eb.db.from('search_profiles').delete(id)
    navigate('/app')
  }

  return (
    <div className="shell">
      <SiteHeader />
      <main className="onboarding-main">
        <div className="panel onboarding-panel">
          <p className="eyebrow">Predwell</p>
          <h2>{isNew ? t('app.newProfile') : t('app.editProfile')}</h2>
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
            <label className="active-toggle">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              {t('app.active')}
            </label>
            {error && <p className="form-note error-note">{error}</p>}
            <button className="button primary" type="submit" disabled={busy}>
              {busy ? t('loading') : t('app.save')}
            </button>
            {!isNew && (
              <button type="button" className="button secondary" onClick={remove}>
                {t('app.delete')}
              </button>
            )}
          </form>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
