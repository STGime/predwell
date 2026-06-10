import { useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { eb } from '../lib/eurobase'
import { useI18n } from '../lib/i18n'
import { SiteFooter, SiteHeader } from '../components/SiteChrome'
import './AuthPage.css'

export function AuthPage({ mode }: { mode: 'signup' | 'login' }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation() as { state?: { from?: string } }
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const { data, error: authError } =
      mode === 'signup'
        ? await eb.auth.signUp({ email, password })
        : await eb.auth.signIn({ email, password })
    setBusy(false)
    if (authError || !data) {
      setError(authError ?? t('error.generic'))
      return
    }
    const intent = searchParams.get('intent')
    if (mode === 'signup') {
      navigate(intent ? `/onboarding?intent=${intent}` : '/onboarding')
    } else {
      navigate(location.state?.from ?? '/app')
    }
  }

  return (
    <div className="shell">
      <SiteHeader />
      <main className="auth-main">
        <div className="panel auth-panel">
          <p className="eyebrow">Predwell</p>
          <h2>{mode === 'signup' ? t('auth.signup.title') : t('auth.login.title')}</h2>
          {mode === 'signup' && <p className="panel-copy">{t('auth.signup.copy')}</p>}
          <form className="auth-form" onSubmit={submit}>
            <label>
              {t('auth.email')}
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </label>
            <label>
              {t('auth.password')}
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
            </label>
            {error && <p className="form-note error-note">{error}</p>}
            <button className="button primary" type="submit" disabled={busy}>
              {busy ? t('loading') : mode === 'signup' ? t('auth.signup.submit') : t('auth.login.submit')}
            </button>
          </form>
          <p className="form-note">
            {mode === 'signup' ? (
              <Link to="/login">{t('auth.haveAccount')}</Link>
            ) : (
              <Link to="/signup">{t('auth.noAccount')}</Link>
            )}
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
