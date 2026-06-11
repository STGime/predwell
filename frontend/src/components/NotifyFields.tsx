import { useI18n } from '../lib/i18n'
import './NotifyFields.css'

export interface NotifyState {
  notify_email: boolean
  notify_push: boolean
}

interface Props {
  value: NotifyState
  onChange: (next: NotifyState) => void
  /** The address email alerts go to (the signup email). Shown next to the toggle. */
  email: string
}

/**
 * "How should we reach you?" — email (pre-selected, shows the signup address)
 * and browser push (stored now, delivery wired later). Reused by onboarding,
 * profile edit, and settings.
 */
export function NotifyFields({ value, onChange, email }: Props) {
  const { t } = useI18n()
  return (
    <div className="notify-fields">
      <span className="chip-group-label">{t('notify.label')}</span>
      <label className="notify-row">
        <input
          type="checkbox"
          checked={value.notify_email}
          onChange={(e) => onChange({ ...value, notify_email: e.target.checked })}
        />
        <span>
          {t('notify.email')}
          {email && <span className="notify-email"> — {email}</span>}
        </span>
      </label>
      <label className="notify-row">
        <input
          type="checkbox"
          checked={value.notify_push}
          onChange={(e) => onChange({ ...value, notify_push: e.target.checked })}
        />
        <span>
          {t('notify.push')} <span className="notify-soon">({t('notify.push.soon')})</span>
        </span>
      </label>
      <p className="form-note">{t('notify.note')}</p>
    </div>
  )
}
