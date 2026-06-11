import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { eb } from '../lib/eurobase'
import { useAuth } from '../lib/auth'
import { useI18n } from '../lib/i18n'
import { fetchProfiles, fetchSubscription, isPro } from '../lib/data'
import type { SearchProfile, Subscription } from '../lib/data'
import { NotifyFields } from '../components/NotifyFields'
import type { NotifyState } from '../components/NotifyFields'
import { SiteFooter, SiteHeader } from '../components/SiteChrome'
import './SettingsPage.css'

export function SettingsPage() {
  const { t } = useI18n()
  const { session } = useAuth()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [profiles, setProfiles] = useState<SearchProfile[]>([])
  const [notify, setNotify] = useState<NotifyState>({ notify_email: true, notify_push: false })
  const [notifySaved, setNotifySaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSubscription().then(setSubscription)
    fetchProfiles().then((rows) => {
      setProfiles(rows)
      if (rows[0]) setNotify({ notify_email: rows[0].notify_email ?? true, notify_push: rows[0].notify_push ?? false })
    })
  }, [])

  // Notification prefs are stored per profile; the dashboard setting applies
  // the choice to all of the user's profiles ("how to reach me").
  async function saveNotify(next: NotifyState) {
    setNotify(next)
    setNotifySaved(false)
    await Promise.all(
      profiles.map((p) => eb.db.from('search_profiles').update(p.id, next)),
    )
    setNotifySaved(true)
  }

  async function upgrade() {
    setBusy(true)
    setError(null)
    const { data, error: fnError } = await eb.functions.invoke<{ checkoutUrl: string }>(
      'create-checkout',
      { body: {} },
    )
    setBusy(false)
    if (fnError || !data?.checkoutUrl) {
      setError(fnError?.message ?? t('error.generic'))
      return
    }
    window.location.href = data.checkoutUrl
  }

  return (
    <div className="shell">
      <SiteHeader />
      <main className="settings-main">
        <div className="panel settings-panel">
          <h2>{t('settings.account')}</h2>
          <p className="panel-copy">{session?.user.email}</p>
          <p className="form-note">
            <Link to="/app">← {t('app.matches')}</Link>
          </p>
        </div>

        <div className="panel settings-panel">
          <h2>{t('settings.notifications')}</h2>
          <NotifyFields value={notify} onChange={saveNotify} email={session?.user.email ?? ''} />
          {notifySaved && <p className="form-note lead-done">{t('settings.saved')}</p>}
        </div>

        <div className="panel settings-panel">
          <h2>{t('settings.subscription')}</h2>
          <p className="panel-copy">
            {isPro(subscription) ? t('settings.plan.pro') : t('settings.plan.free')}
          </p>
          {subscription && (
            <p className="form-note">{t('settings.manage', { status: subscription.status })}</p>
          )}
          {!isPro(subscription) && (
            <>
              <button className="button primary" onClick={upgrade} disabled={busy}>
                {busy ? t('loading') : t('settings.upgrade')}
              </button>
              {error && <p className="form-note error-note">{error}</p>}
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
