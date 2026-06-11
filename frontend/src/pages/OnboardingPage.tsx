import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { eb } from '../lib/eurobase'
import { useAuth } from '../lib/auth'
import { useI18n } from '../lib/i18n'
import { fetchDistricts } from '../lib/data'
import type { District } from '../lib/data'
import { SearchFields, emptySearch } from '../components/SearchFields'
import type { SearchFormState } from '../components/SearchFields'
import { NotifyFields } from '../components/NotifyFields'
import type { NotifyState } from '../components/NotifyFields'
import { SiteFooter, SiteHeader } from '../components/SiteChrome'
import './OnboardingPage.css'

export function OnboardingPage() {
  const { t } = useI18n()
  const { session } = useAuth()
  const navigate = useNavigate()
  const [districts, setDistricts] = useState<District[]>([])
  const [name, setName] = useState('')
  const [search, setSearch] = useState<SearchFormState>({ ...emptySearch, budget: '1400' })
  const [notify, setNotify] = useState<NotifyState>({ notify_email: true, notify_push: false })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetchDistricts().then(setDistricts)
  }, [])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!session) return
    setBusy(true)
    setError(null)
    const { error: insertError } = await eb.db.from('search_profiles').insert({
      user_id: session.user.id,
      email: session.user.email,
      name: name.trim() || t('onboarding.name.placeholder'),
      budget_max: parseInt(search.budget, 10) || 1400,
      rooms_min: parseFloat(search.rooms) || 1,
      district_ids: search.districtIds,
      features: { features: search.features, proximity: search.proximity },
      query_text: search.text.trim() || null,
      notify_email: notify.notify_email,
      notify_push: notify.notify_push,
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
            <SearchFields value={search} onChange={setSearch} districts={districts} />
            <NotifyFields value={notify} onChange={setNotify} email={session?.user.email ?? ''} />
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
