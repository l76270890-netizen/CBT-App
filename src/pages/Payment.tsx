import { useState } from 'react'
import { ArrowLeft, Check, Clock3, CreditCard, Crown, ShieldCheck } from 'lucide-react'
import { apiRequest } from '../api'
import type { CheckoutDetails } from './Register'
import './Auth.css'

type PaystackInitializationResponse = {
  authorizationUrl?: string
  authorization_url?: string
}

const planDetails = {
  monthly: {
    title: 'Monthly Plan',
    duration: 'Full CBT platform access for one month',
    Icon: Clock3,
  },
  yearly: {
    title: 'Yearly Plan',
    duration: 'Full CBT platform access for one year',
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
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const plan = planDetails[details.plan]
  const PlanIcon = plan.Icon

  const handlePaystackCheckout = async () => {
    setError('')
    setIsLoading(true)
    try {
      const response = await apiRequest<PaystackInitializationResponse>('/api/payments/paystack/initialize', {
        method: 'POST',
        body: JSON.stringify({
          name: details.name,
          email: details.email,
          plan: details.plan,
        }),
      })
      const authorizationUrl = response?.authorizationUrl ?? response?.authorization_url
      if (typeof authorizationUrl !== 'string') {
        throw new Error('The payment service did not return a Paystack checkout URL.')
      }

      const checkoutUrl = new URL(authorizationUrl)
      if (checkoutUrl.protocol !== 'https:' || checkoutUrl.hostname !== 'checkout.paystack.com') {
        throw new Error('The payment service returned an invalid secure checkout URL.')
      }

      window.location.assign(checkoutUrl.href)
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'Could not start Paystack checkout. Please try again.')
      setIsLoading(false)
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
            <div className="payment-summary-total"><span>Amount due</span><strong>Price coming soon</strong></div>
          </div>

            <div className="payment-unavailable">
            <ShieldCheck size={18} />
              <p><strong>Secure Paystack checkout.</strong> Your payment session is prepared by the server, and payment details are entered on Paystack.</p>
          </div>
            {error && <div className="auth-error payment-error" role="alert">{error}</div>}
            <button type="button" className="auth-btn-primary" onClick={handlePaystackCheckout} disabled={isLoading}>
              {isLoading ? 'Connecting to Paystack...' : 'Pay securely with Paystack'}
            </button>
            <p className="auth-secure-note"><ShieldCheck size={14} /> Card details are entered on Paystack’s secure checkout page.</p>
        </section>
      </main>
    </div>
  )
}
