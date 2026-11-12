import { useState } from 'react'
import { ArrowLeft, Check, Clock3, Crown, RefreshCw, ShieldCheck, Sun, Timer } from 'lucide-react'
import { apiRequest } from '../api'
import { useAuth } from '../context/AuthContext'
import { useSubscription } from '../context/SubscriptionContext'
import { formatExpiryDate, formatRemaining } from '../subscription'
import type { SubscriptionPlan } from './Register'
import './Auth.css'

const plans: Array<{ id: SubscriptionPlan; title: string; price: string; description: string; Icon: typeof Sun }> = [
  { id: 'daily', title: 'Daily Plan', price: '₦100', description: 'Full CBT platform access for one day.', Icon: Sun },
  { id: 'weekly', title: 'Weekly Plan', price: '₦300', description: 'Full CBT platform access for one week.', Icon: Timer },
  { id: 'monthly', title: 'Monthly Plan', price: '₦5,000', description: 'Full CBT platform access for one month.', Icon: Clock3 },
  { id: 'yearly', title: 'Yearly Plan', price: '₦25,000', description: 'Full CBT platform access for one year.', Icon: Crown },
]

export default function Renew({ setActivePage }: { setActivePage: (page: string) => void }) {
  const { user } = useAuth()
  const { status, blocked, loading, refresh } = useSubscription()
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null)
  const [isStartingCheckout, setIsStartingCheckout] = useState(false)
  const [error, setError] = useState('')

  const startCheckout = async () => {
    if (!selectedPlan) {
      setError('Choose a plan to renew your subscription.')
      return
    }
    setIsStartingCheckout(true)
    setError('')
    try {
      const response = await apiRequest<{ authorization_url?: unknown }>(
        '/api/payments/paystack/initialize',
        { method: 'POST', body: JSON.stringify({ plan: selectedPlan }) },
      )
      if (typeof response.authorization_url !== 'string') {
        throw new Error('The server did not return a Paystack checkout URL.')
      }
      window.location.assign(response.authorization_url)
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'Unable to start checkout.')
      setIsStartingCheckout(false)
    }
  }

  const statusLine = status?.active
    ? `Current access ends in ${formatRemaining(status.remainingMs)}${status.expiresAt ? ` (${formatExpiryDate(status.expiresAt)})` : ''}.`
    : status?.expiresAt
      ? `Your subscription expired on ${formatExpiryDate(status.expiresAt)}.`
      : 'Your subscription is not active.'

  return (
    <div className="auth-page auth-register-page">
      <header className="auth-register-header">
        <button type="button" className="auth-register-brand" onClick={() => setActivePage('landing')}>
          <img className="auth-logo" src="/icons/examcore-192.png" alt="" />
          <span>EXAMCORE</span>
        </button>
        <span className="payment-step-label">SUBSCRIPTION RENEWAL</span>
      </header>

      <main className="auth-register-main">
        <section className="auth-card register-card">
          <button type="button" className="auth-back-link payment-back" onClick={() => setActivePage(blocked ? 'subscriptionExpired' : 'home')}>
            <ArrowLeft size={15} /> Back
          </button>
          <div className="auth-card-eyebrow">KEEP YOUR ACCESS</div>
          <h1 className="auth-title">Renew your subscription</h1>
          <p className="auth-subtitle">
            {user?.email ? `Renewing for ${user.email}. ` : ''}{statusLine}
          </p>

          <div className="auth-plan-section">
            <div className="auth-plan-heading">
              <div className="auth-card-eyebrow">CHOOSE A PLAN</div>
              <h2>Extend your access</h2>
              <p>Your new period starts as soon as the renewal is activated.</p>
            </div>
            <div className="auth-plan-grid" role="radiogroup" aria-label="Choose a renewal plan">
              {plans.map(({ id, title, price, description, Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={selectedPlan === id}
                  className={`auth-plan-card${selectedPlan === id ? ' selected' : ''}`}
                  onClick={() => { setSelectedPlan(id); setError('') }}
                >
                  <span className="auth-plan-top">
                    <span className="auth-plan-icon"><Icon size={19} /></span>
                    {selectedPlan === id && <span className="auth-plan-check"><Check size={14} /></span>}
                  </span>
                  <strong>{title}</strong>
                  <span className="auth-plan-price">{price}</span>
                  <span className="auth-plan-description">{description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="payment-unavailable">
            <ShieldCheck size={18} />
            <p><strong>Secure Paystack checkout.</strong> After payment, enter the activation PIN sent to your email to restore access.</p>
          </div>
          {error && <div className="auth-error" role="alert">{error}</div>}
          <button type="button" className="auth-btn-primary" onClick={startCheckout} disabled={isStartingCheckout}>
            {isStartingCheckout ? 'Connecting to Paystack...' : 'Renew with Paystack'}
          </button>
          <button type="button" className="auth-activation-link" onClick={() => setActivePage('activation')}>
            Already have an activation PIN?
          </button>
          <button
            type="button"
            className="auth-back-link"
            onClick={() => {
              void (async () => {
                const next = await refresh()
                if (next?.active) {
                  setActivePage('home')
                  return
                }
                // If payment was made, access is restored only after server-verified activation (PIN redemption).
                setActivePage('activation')
              })()
            }}
            disabled={loading}
          >
            <RefreshCw size={15} /> {loading ? 'Checking access...' : 'I have already renewed'}
          </button>
        </section>
      </main>
    </div>
  )
}
