import './AlertCard.css'

interface Props {
  topline: string
  liveLabel: string
  matchLabel: string
  title: string
  meta: string
  fitNote: string
  source: string
  cta: string
  postedLabel: string
}

/**
 * Hero mock of an instant match alert — the product's primary deliverable.
 * Deliberately shows the "View on {source}" link to make the traffic-to-source
 * story visible (we send qualified renters straight to the original listing).
 */
export function AlertCard({
  topline,
  liveLabel,
  matchLabel,
  title,
  meta,
  fitNote,
  source,
  cta,
  postedLabel,
}: Props) {
  return (
    <aside className="alert-card" aria-label="Instant match alert preview">
      <div className="alert-topline">
        <span>{topline}</span>
        <span className="alert-live">
          <span className="alert-dot" />
          {liveLabel}
        </span>
      </div>

      <div className="alert-body">
        <div className="alert-score-row">
          <span className="alert-score">92%</span>
          <span className="alert-score-label">{matchLabel}</span>
          <span className="alert-posted">{postedLabel}</span>
        </div>
        <strong className="alert-title">{title}</strong>
        <p className="alert-meta">{meta}</p>
        <p className="alert-fit">{fitNote}</p>
        <span className="alert-cta">{cta.replace('{source}', source)} →</span>
      </div>
    </aside>
  )
}
