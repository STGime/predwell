import { Link } from 'react-router-dom'
import { useI18n } from '../lib/i18n'
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
  return (
    <header className="site-header" aria-label="Predwell header">
      <Link to="/" className="brand" aria-label="Predwell">
        <span className="brand-mark">P</span>
        <span>Predwell</span>
      </Link>
      <div className="header-right">
        {children ?? <div className="nav-note">{t('nav.tagline')}</div>}
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
