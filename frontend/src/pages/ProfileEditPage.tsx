import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { eb } from '../lib/eurobase'
import { useAuth } from '../lib/auth'
import { useI18n } from '../lib/i18n'
import { fetchDistricts, fetchProfiles, fetchSubscription, profileLimit } from '../lib/data'
import type { District } from '../lib/data'
import { SearchFields, emptySearch } from '../components/SearchFields'
import type { SearchFormState } from '../components/SearchFields'
import { NotifyFields } from '../components/NotifyFields'
import type { NotifyState } from '../components/NotifyFields'
import { SiteFooter, SiteHeader } from '../components/SiteChrome'
import './OnboardingPage.css'

export function ProfileEditPage() {
  const { t } = useI18n()
  const { session } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams()
  const isNew = id === 'new'

  const [districts, setDistricts] = useState<District[]>([])
  const [name, setName] = useState('')
  const [search, setSearch] = useState<SearchFormState>({ ...emptySearch, budget: '1400' })
  const [notify, setNotify] = useState<NotifyState>({ notify_email: true, notify_push: false })
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
      setIsActive(profile.is_active)
      setNotify({ notify_email: profile.notify_email ?? true, notify_push: profile.notify_push ?? false })
      setSearch({
        text: profile.query_text ?? '',
        budget: String(profile.budget_max),
        rooms: String(profile.rooms_min),
        districtIds: profile.district_ids ?? [],
        features: profile.features?.features ?? {},
        proximity: profile.features?.proximity ?? {},
      })
    }
    load()
  }, [id, isNew, navigate])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!session) return
    setBusy(true)
    setError(null)
    const payload = {
      name: name.trim() || t('onboarding.name.placeholder'),
      budget_max: parseInt(search.budget, 10) || 1400,
      rooms_min: parseFloat(search.rooms) || 1,
      district_ids: search.districtIds,
      features: { features: search.features, proximity: search.proximity },
      query_text: search.text.trim() || null,
      notify_email: notify.notify_email,
      notify_push: notify.notify_push,
      is_active: isActive,
    }
    const { error: dbError } = isNew
      ? await eb.db.from('search_profiles').insert({ ...payload, user_id: session.user.id, email: session.user.email })
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
            <SearchFields value={search} onChange={setSearch} districts={districts} />
            <NotifyFields value={notify} onChange={setNotify} email={session?.user.email ?? ''} />
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
