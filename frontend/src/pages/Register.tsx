import { useState, type FormEvent } from 'react'
import { ArrowRight, Check, Clock3, Crown, Sun, Timer } from 'lucide-react'
import './Auth.css'

export type SubscriptionPlan = 'daily' | 'weekly' | 'monthly' | 'yearly'
export type CheckoutDetails = { name: string; email: string; plan: SubscriptionPlan }

export default function Register({
  setActivePage,
  onContinueToPayment,
  hidden = false,
}: {
  setActivePage: (p: string) => void
  onContinueToPayment: (details: CheckoutDetails) => void
  hidden?: boolean
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null)
  const [error, setError] = useState('')

  const handleRegister = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (!name.trim() || !email.trim() || !password || !confirmPassword) return setError('Fill all fields')
    if (password !== confirmPassword) return setError('Passwords do not match')
    if (!selectedPlan) return setError('Choose a subscription plan to continue')
    onContinueToPayment({ name: name.trim(), email: email.trim(), plan: selectedPlan })
  }

  return (
    <div className="auth-page auth-register-page" hidden={hidden}>
      <header className="auth-register-header">
        <button type="button" className="auth-register-brand" onClick={() => setActivePage('landing')}>
          <img className="auth-logo" src="/icons/examcore-192.png" alt="" />
          <span>EXAMCORE</span>
        </button>
        <div>Already have an account? <button type="button" className="auth-link" onClick={() => setActivePage('login')}>Sign in</button></div>
      </header>

      <main className="auth-register-main">
        <section className="auth-card register-card">
          <div className="auth-card-eyebrow">GET STARTED</div>
          <h1 className="auth-title">Create your account</h1>
          <p className="auth-subtitle">Set up your profile and choose how long you’d like full CBT access.</p>

          <form className="auth-form" onSubmit={handleRegister}>
            {error && <div className="auth-error" role="alert">{error}</div>}
            <div className="auth-register-fields">
              <div className="input-group">
                <label htmlFor="register-name">Full Name</label>
                <input id="register-name" className="auth-input" value={name} onChange={event => setName(event.target.value)} placeholder="Your full name" autoComplete="name" required />
              </div>
              <div className="input-group">
                <label htmlFor="register-email">Email Address</label>
                <input id="register-email" className="auth-input" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" type="email" autoComplete="email" required />
              </div>
              <div className="input-group">
                <label htmlFor="register-password">Password</label>
                <input id="register-password" className="auth-input" value={password} onChange={event => setPassword(event.target.value)} placeholder="Create a password" type="password" autoComplete="new-password" required />
              </div>
              <div className="input-group">
                <label htmlFor="register-confirm-password">Confirm Password</label>
                <input id="register-confirm-password" className="auth-input" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} placeholder="Enter your password again" type="password" autoComplete="new-password" required />
              </div>
            </div>

            <div className="auth-plan-section">
              <div className="auth-plan-heading">
                <div className="auth-card-eyebrow">PLANS FOR YOUR PREPARATION</div>
                <h2>Choose Your Subscription</h2>
                <p>Get full access to the CBT platform for the period you choose.</p>
              </div>
              <div className="auth-plan-grid" role="radiogroup" aria-label="Choose your subscription">
                <button
                  type="button"
                  role="radio"
                  aria-checked={selectedPlan === 'daily'}
                  className={`auth-plan-card${selectedPlan === 'daily' ? ' selected' : ''}`}
                  onClick={() => setSelectedPlan('daily')}
                >
                  <span className="auth-plan-top"><span className="auth-plan-icon"><Sun size={19} /></span>{selectedPlan === 'daily' && <span className="auth-plan-check"><Check size={14} /></span>}</span>
                  <strong>Daily Plan</strong>
                  <span className="auth-plan-price">₦100</span>
                  <span className="auth-plan-description">Full CBT platform access for one day.</span>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={selectedPlan === 'weekly'}
                  className={`auth-plan-card${selectedPlan === 'weekly' ? ' selected' : ''}`}
                  onClick={() => setSelectedPlan('weekly')}
                >
                  <span className="auth-plan-top"><span className="auth-plan-icon"><Timer size={19} /></span>{selectedPlan === 'weekly' && <span className="auth-plan-check"><Check size={14} /></span>}</span>
                  <strong>Weekly Plan</strong>
                  <span className="auth-plan-price">₦300</span>
                  <span className="auth-plan-description">Full CBT platform access for one week.</span>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={selectedPlan === 'monthly'}
                  className={`auth-plan-card${selectedPlan === 'monthly' ? ' selected' : ''}`}
                  onClick={() => setSelectedPlan('monthly')}
                >
                  <span className="auth-plan-top"><span className="auth-plan-icon"><Clock3 size={19} /></span>{selectedPlan === 'monthly' && <span className="auth-plan-check"><Check size={14} /></span>}</span>
                  <strong>Monthly Plan</strong>
                  <span className="auth-plan-price">₦5,000</span>
                  <span className="auth-plan-description">Full CBT platform access for one month.</span>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={selectedPlan === 'yearly'}
                  className={`auth-plan-card${selectedPlan === 'yearly' ? ' selected' : ''}`}
                  onClick={() => setSelectedPlan('yearly')}
                >
                  <span className="auth-plan-top"><span className="auth-plan-icon"><Crown size={19} /></span>{selectedPlan === 'yearly' && <span className="auth-plan-check"><Check size={14} /></span>}</span>
                  <strong>Yearly Plan</strong>
                  <span className="auth-plan-price">₦25,000</span>
                  <span className="auth-plan-description">Full CBT platform access for one year.</span>
                </button>
              </div>
            </div>

            <p className="auth-phase-note">After payment, check your email for an activation PIN. Use it to activate your subscription.</p>
            <button className="auth-btn-primary" type="submit">
              Continue to Payment <ArrowRight size={17} />
            </button>
          </form>

          <button type="button" className="auth-activation-link" onClick={() => setActivePage('activation')}>Have an activation PIN?</button>
          <div className="auth-demo">
            <div>
              <strong>Want to explore before subscribing?</strong>
              <p>Explore our CBT platform with a free demo account.</p>
            </div>
            <button type="button" onClick={() => setActivePage('demo')}>Try Free Demo</button>
          </div>
        </section>
      </main>
    </div>
  )
}
