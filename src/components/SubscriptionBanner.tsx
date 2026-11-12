import { AlertTriangle, ArrowRight, Clock3, RefreshCw } from 'lucide-react'
import { useSubscription } from '../context/SubscriptionContext'
import { formatRemaining } from '../subscription'
import './SubscriptionBanner.css'

export default function SubscriptionBanner({ onRenew }: { onRenew: () => void }) {
  const { status, blocked, error, loading, refresh } = useSubscription()

  if (blocked) return null

  // The status check failed (5xx / network). Say so rather than showing nothing.
  if (error && !status) {
    return (
      <div className="subscription-banner subscription-banner-urgent" role="alert">
        <span className="subscription-banner-icon" aria-hidden="true">
          <AlertTriangle size={18} />
        </span>
        <div className="subscription-banner-copy">
          <strong>Could not check your subscription</strong>
          <p>{error}</p>
        </div>
        <button type="button" className="subscription-banner-action" onClick={() => { void refresh() }} disabled={loading}>
          <RefreshCw size={15} /> {loading ? 'Checking...' : 'Retry'}
        </button>
      </div>
    )
  }

  if (!status?.expiringSoon) return null

  const urgent = status.remainingMs <= 60 * 60 * 1000

  return (
    <div
      className={`subscription-banner${urgent ? ' subscription-banner-urgent' : ''}`}
      role="status"
      aria-live="polite"
    >
      <span className="subscription-banner-icon" aria-hidden="true">
        {urgent ? <AlertTriangle size={18} /> : <Clock3 size={18} />}
      </span>
      <div className="subscription-banner-copy">
        <strong>Your subscription expires soon</strong>
        <p>
          {status.plan ? `${status.plan} access ends` : 'Access ends'} in{' '}
          <span className="subscription-banner-countdown">{formatRemaining(status.remainingMs)}</span>.
          Renew now to keep practising without interruption.
        </p>
      </div>
      <button type="button" className="subscription-banner-action" onClick={onRenew}>
        Renew <ArrowRight size={15} />
      </button>
    </div>
  )
}
