import { useI18n } from '../lib/i18n'
import type { TranslationKey } from '../lib/i18n'
import { useSearchParser } from '../lib/useSearchParser'
import { FEATURE_KEYS, PROXIMITY_KEYS } from '../lib/data'
import type { District, FeatureKey, ProximityKey, ParsedSearch } from '../lib/data'
import './SearchFields.css'

export interface SearchFormState {
  text: string
  budget: string
  rooms: string
  districtIds: string[]
  features: Partial<Record<FeatureKey, boolean>>
  proximity: Partial<Record<ProximityKey, boolean>>
}

export const emptySearch: SearchFormState = {
  text: '',
  budget: '',
  rooms: '2',
  districtIds: [],
  features: {},
  proximity: {},
}

interface Props {
  value: SearchFormState
  onChange: (next: SearchFormState) => void
  districts: District[]
  /** Hide the district chips (e.g. landing report keeps areas implicit). */
  showDistricts?: boolean
}

/**
 * The reusable smart-search block: a free-text box that, debounced, parses into
 * the structured controls below it (budget, rooms, districts, feature +
 * proximity chips) — all of which stay editable. Falls back to fully manual
 * controls if the parser is unavailable.
 */
export function SearchFields({ value, onChange, districts, showDistricts = true }: Props) {
  const { t } = useI18n()

  function applyParsed(p: ParsedSearch) {
    onChange({
      ...value,
      budget: p.budget_max != null ? String(p.budget_max) : value.budget,
      rooms: p.rooms_min != null ? String(p.rooms_min) : value.rooms,
      districtIds: p.district_ids.length ? p.district_ids : value.districtIds,
      features: { ...value.features, ...p.features },
      proximity: { ...value.proximity, ...p.proximity },
    })
  }

  const { parsing, result, unavailable } = useSearchParser(value.text, applyParsed)

  function toggleDistrict(id: string) {
    const has = value.districtIds.includes(id)
    onChange({
      ...value,
      districtIds: has ? value.districtIds.filter((d) => d !== id) : [...value.districtIds, id],
    })
  }
  function toggleFeature(k: FeatureKey) {
    onChange({ ...value, features: { ...value.features, [k]: !value.features[k] } })
  }
  function toggleProximity(k: ProximityKey) {
    onChange({ ...value, proximity: { ...value.proximity, [k]: !value.proximity[k] } })
  }

  return (
    <div className="search-fields">
      <label className="smart-label">
        {t('search.freetext.label')}
        <textarea
          className="smart-text"
          rows={2}
          value={value.text}
          placeholder={t('search.freetext.placeholder')}
          onChange={(e) => onChange({ ...value, text: e.target.value })}
        />
      </label>
      {parsing && <p className="form-note smart-status">{t('search.parsing')}</p>}
      {!parsing && !unavailable && result?.summary && (
        <p className="form-note smart-status">
          {t('search.understood')}: {result.summary}
        </p>
      )}

      <div className="field-grid">
        <label>
          {t('report.budget')}
          <input
            inputMode="numeric"
            placeholder="€1,400"
            value={value.budget}
            onChange={(e) => onChange({ ...value, budget: e.target.value.replace(/[^0-9]/g, '') })}
          />
        </label>
        <label>
          {t('report.bedrooms')}
          <select value={value.rooms} onChange={(e) => onChange({ ...value, rooms: e.target.value })}>
            <option value="1">{t('report.rooms.1')}</option>
            <option value="2">{t('report.rooms.2')}</option>
            <option value="3">{t('report.rooms.3plus')}</option>
          </select>
        </label>
      </div>

      {showDistricts && (
        <div className="chip-group">
          <span className="chip-group-label">{t('onboarding.districts')}</span>
          <div className="chip-row">
            {districts.map((d) => (
              <button
                type="button"
                key={d.id}
                className={`chip${value.districtIds.includes(d.id) ? ' is-selected' : ''}`}
                onClick={() => toggleDistrict(d.id)}
              >
                {d.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="chip-group">
        <span className="chip-group-label">{t('search.proximity.label')}</span>
        <div className="chip-row">
          {PROXIMITY_KEYS.map((k) => (
            <button
              type="button"
              key={k}
              className={`chip${value.proximity[k] ? ' is-selected' : ''}`}
              onClick={() => toggleProximity(k)}
            >
              {t(`prox.${k}` as TranslationKey)}
            </button>
          ))}
        </div>
      </div>

      <div className="chip-group">
        <span className="chip-group-label">{t('search.features.label')}</span>
        <div className="chip-row">
          {FEATURE_KEYS.map((k) => (
            <button
              type="button"
              key={k}
              className={`chip${value.features[k] ? ' is-selected' : ''}`}
              onClick={() => toggleFeature(k)}
            >
              {t(`feat.${k}` as TranslationKey)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
