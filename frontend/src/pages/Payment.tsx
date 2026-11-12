import { useState } from 'react'
import { ArrowLeft, Check, Clock3, CreditCard, Crown, ShieldCheck, Sun } from 'lucide-react'
import { apiRequest } from '../api'
import type { CheckoutDetails } from './Register'
import './Auth.css'

const planDetails = {
  daily: {
    title: 'Daily Plan',
    duration: 'Full CBT platform access for one day',
    price: '₦100',
    Icon: Sun,
  },
  weekly: {
    title: 'Weekly Plan',
    duration: 'Full CBT platform access for one week',
    price: '₦300',
    Icon: Clock3,
  },
  monthly: {
    title: 'Monthly Plan',
    duration: 'Full CBT platform access for one month',
    price: '₦5,000',
    Icon: Clock3,
  },
  yearly: {
    title: 'Yearly Plan',
    duration: 'Full CBT platform access for one year',
    price: '₦25,000',
    Icon: Crown,
  },
}

export default function Payment({
  details,
  setActivePage,
}: {
  details: CheckoutDetails
  setActivePage: (page: string) => void
}) {
  const [isStartingCheckout, setIsStartingCheckout] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const plan = planDetails[details.plan]
  const PlanIcon = plan.Icon

  const startCheckout = async () => {
    setIsStartingCheckout(true)
    setCheckoutError('')

    try {
      const response = await apiRequest<{ authorization_url?: unknown }>(
        '/api/payments/paystack/initialize',
        { method: 'POST', body: JSON.stringify({ plan: details.plan }) },
      )
      if (typeof response.authorization_url !== 'string') {
        throw new Error('The server did not return a Paystack checkout URL.')
      }

      window.location.assign(response.authorization_url)
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'Unable to start checkout.')
      setIsStartingCheckout(false)
    }
  }

  return (
    <div className="auth-page auth-register-page">
      <header className="auth-register-header">
        <button type="button" className="auth-register-brand" onClick={() => setActivePage('landing')}>
          <img className="auth-logo" src="/icons/examcore-192.png" alt="" />
          <span>EXAMCORE</span>
        </button>
        <span className="payment-step-label">SUBSCRIPTION CHECKOUT</span>
      </header>

      <main className="auth-payment-main">
        <section className="auth-card auth-payment-card">
          <button type="button" className="auth-back-link payment-back" onClick={() => setActivePage('register')}>
            <ArrowLeft size={15} /> Back to registration
          </button>
          <span className="auth-activation-icon"><CreditCard size={23} /></span>
          <div className="auth-card-eyebrow">ALMOST THERE</div>
          <h1 className="auth-title">Continue to payment</h1>
          <p className="auth-subtitle">Review your account and subscription details before checkout.</p>

          <div className="payment-summary">
            <div className="payment-summary-heading">
              <span className="auth-plan-icon"><PlanIcon size={19} /></span>
              <span><strong>{plan.title}</strong><small>{plan.duration}</small></span>
              <span className="auth-plan-check"><Check size={14} /></span>
            </div>
            <div className="payment-summary-row"><span>Account name</span><strong>{details.name}</strong></div>
            <div className="payment-summary-row"><span>Email address</span><strong>{details.email}</strong></div>
            <div className="payment-summary-total"><span>Amount due</span><strong>{plan.price}</strong></div>
          </div>

          <div className="payment-unavailable">
            <ShieldCheck size={18} />
            <p><strong>Secure Paystack checkout.</strong> You’ll complete your payment on Paystack’s hosted page.</p>
          </div>
          {checkoutError && <div className="auth-error" role="alert">{checkoutError}</div>}
          <button type="button" className="auth-btn-primary" onClick={startCheckout} disabled={isStartingCheckout}>
            {isStartingCheckout ? 'Connecting to Paystack...' : 'Pay securely with Paystack'}
          </button>
          <p className="auth-secure-note"><ShieldCheck size={14} /> Your account should be activated only after payment is verified by the server.</p>
        </section>
      </main>
    </div>
  )
}
