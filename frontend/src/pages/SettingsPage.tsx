import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { eb } from '../lib/eurobase'
import { useAuth } from '../lib/auth'
import { useI18n } from '../lib/i18n'
import { fetchSubscription, isPro } from '../lib/data'
import type { Subscription } from '../lib/data'
import { SiteFooter, SiteHeader } from '../components/SiteChrome'
import './SettingsPage.css'

export function SettingsPage() {
  const { t } = useI18n()
  const { session } = useAuth()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSubscription().then(setSubscription)
  }, [])

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
