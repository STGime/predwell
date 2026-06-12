import { Link } from 'react-router-dom'
import { useI18n } from '../lib/i18n'
import { useAuth } from '../lib/auth'
import './SiteChrome.css'

export function LangToggle() {
  const { lang, setLang } = useI18n()
  return (
    <div className="lang-toggle" role="group" aria-label="Language">
      <button className={lang === 'en' ? 'is-active' : ''} onClick={() => setLang('en')}>
        EN
      </button>
      <button className={lang === 'de' ? 'is-active' : ''} onClick={() => setLang('de')}>
        DE
      </button>
    </div>
  )
}

export function SiteHeader({ children }: { children?: React.ReactNode }) {
  const { t } = useI18n()
  const { session } = useAuth()
  // Logged in: the logo goes to the dashboard (not the public landing page,
  // which looks like a logout), and we surface an explicit Dashboard link.
  return (
    <header className="site-header" aria-label="Predwell header">
      <Link to={session ? '/app' : '/'} className="brand" aria-label="Predwell">
        <span className="brand-mark">P</span>
        <span>Predwell</span>
      </Link>
      <div className="header-right">
        {children ??
          (session ? (
            <Link className="nav-note" to="/app">
              {t('nav.dashboard')}
            </Link>
          ) : (
            <Link className="nav-note" to="/login">
              {t('nav.login')}
            </Link>
          ))}
        <LangToggle />
      </div>
    </header>
  )
}

export function SiteFooter() {
  const { t } = useI18n()
  return (
    <footer className="site-footer">
      <span>{t('footer.left')}</span>
      <span>{t('footer.right')}</span>
    </footer>
  )
}
