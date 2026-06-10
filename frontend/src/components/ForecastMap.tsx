import './ForecastMap.css'

export interface ForecastPin {
  /** 0–100 probability shown inside the pin */
  percent: number
  top: string
  left?: string
  right?: string
  secondary?: boolean
}

export interface ForecastDistrict {
  name: string
  top?: string
  bottom?: string
  left?: string
  right?: string
}

interface Props {
  toplineLeft: string
  toplineRight: string
  districts: ForecastDistrict[]
  pins: ForecastPin[]
  metrics: { value: string; label: string }[]
}

/**
 * The signature "Availability forecast" card: a stylized district map with
 * percentage pins, used on the landing hero and the dashboard outlook panel.
 */
export function ForecastMap({ toplineLeft, toplineRight, districts, pins, metrics }: Props) {
  return (
    <aside className="signal-card">
      <div className="map-topline">
        <span>{toplineLeft}</span>
        <span>{toplineRight}</span>
      </div>
      <div className="district-map">
        {districts.map((d) => (
          <span
            key={d.name}
            className="district"
            style={{ top: d.top, bottom: d.bottom, left: d.left, right: d.right }}
          >
            {d.name}
          </span>
        ))}
        {pins.map((p, i) => (
          <span
            key={i}
            className={`pin${p.secondary ? ' secondary-pin' : ''}`}
            style={{ top: p.top, left: p.left, right: p.right }}
          >
            <span>{p.percent}%</span>
          </span>
        ))}
      </div>
      <div className="card-footer">
        {metrics.map((m) => (
          <div className="metric" key={m.label}>
            <strong>{m.value}</strong>
            <span>{m.label}</span>
          </div>
        ))}
      </div>
    </aside>
  )
}
