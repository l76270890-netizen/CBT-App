import { useState, type FormEvent } from 'react'
import { ArrowLeft, KeyRound, ShieldCheck } from 'lucide-react'
import { apiRequest } from '../api'
import { SCHOOL_ID } from '../config'
import { useAuth } from '../context/AuthContext'
import './Auth.css'

type RedeemResponse = {
  success: boolean
  user_id?: string | number
  username?: string
  email?: string
  role?: string
  subscription_plan?: string
  subscription_expires_at?: string
  error?: string
}

export default function Activation({ setActivePage }: { setActivePage: (page: string) => void }) {
  const { setUserData } = useAuth()
  const [email, setEmail] = useState('')
  const [pin, setPin] = useState('')
  const [isNewAccount, setIsNewAccount] = useState(false)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleActivate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (isNewAccount && !name.trim()) {
      setError('Enter your full name to create a new account.')
      return
    }
    if (isNewAccount && password.length < 8) {
      setError('Your password must be at least 8 characters.')
      return
    }

    setIsLoading(true)
    try {
      const request: { email: string; pin: string; name?: string; password?: string; schoolId?: string } = {
        email: email.trim(),
        pin: pin.trim(),
      }
      if (isNewAccount) {
        request.name = name.trim()
        request.password = password
      }
      if (SCHOOL_ID) request.schoolId = SCHOOL_ID

      const result = await apiRequest<RedeemResponse>('/api/payments/paystack/redeem', {
        method: 'POST',
        body: JSON.stringify(request),
      })
      if (!result?.success || result.user_id === undefined) {
        throw new Error(result?.error || 'The activation service returned an invalid response.')
      }

      setUserData(result)
      setActivePage('home')
    } catch (activationError) {
      setError(activationError instanceof Error ? activationError.message : 'Could not activate this account. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-page auth-activation-page">
      <header className="auth-register-header">
        <button type="button" className="auth-register-brand" onClick={() => setActivePage('landing')}>
          <img className="auth-logo" src="/icons/examcore-192.png" alt="" />
          <span>EXAMCORE</span>
        </button>
        <button type="button" className="auth-link" onClick={() => setActivePage('login')}>Sign in</button>
      </header>
      <main className="auth-activation-main">
        <section className="auth-card auth-activation-card">
          <span className="auth-activation-icon"><KeyRound size={23} /></span>
          <div className="auth-card-eyebrow">SUBSCRIPTION ACCESS</div>
          <h1 className="auth-title">Account Activation</h1>
          <p className="auth-subtitle">Enter the PIN sent to your email after Paystack verifies your payment.</p>
          <form className="auth-form" onSubmit={handleActivate}>
            <div className="input-group">
              <label htmlFor="activation-email">Email Address</label>
              <input
                id="activation-email"
                className="auth-input"
                value={email}
                onChange={event => setEmail(event.target.value)}
                placeholder="you@example.com"
                type="email"
                autoComplete="email"
                required
              />
            </div>
            <div className="input-group">
              <label htmlFor="activation-pin">Activation PIN</label>
              <input
                id="activation-pin"
                className="auth-input auth-pin-input"
                value={pin}
                onChange={event => setPin(event.target.value)}
                placeholder="Enter your PIN"
                autoComplete="one-time-code"
                aria-describedby="activation-instructions"
                required
              />
            </div>
            <p className="auth-activation-instructions" id="activation-instructions">PINs expire after 24 hours and allow up to five attempts. Existing accounts keep their current password.</p>
            <label className="auth-new-account-toggle">
              <input
                type="checkbox"
                checked={isNewAccount}
                onChange={event => {
                  setIsNewAccount(event.target.checked)
                  setName('')
                  setPassword('')
                }}
              />
              <span>I’m a new student and need to create an account</span>
            </label>
            {isNewAccount && (
              <>
                <div className="input-group">
                  <label htmlFor="activation-name">Full Name</label>
                  <input
                    id="activation-name"
                    className="auth-input"
                    value={name}
                    onChange={event => setName(event.target.value)}
                    placeholder="Your full name"
                    autoComplete="name"
                    required
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="activation-password">Create Password</label>
                  <input
                    id="activation-password"
                    className="auth-input"
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    placeholder="At least 8 characters"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </div>
              </>
            )}
            {error && <div className="auth-error" role="alert">{error}</div>}
            <button type="submit" className="auth-btn-primary" disabled={isLoading}>
              {isLoading ? 'Activating account...' : 'Activate Account'}
            </button>
          </form>
          <button type="button" className="auth-back-link" onClick={() => setActivePage('login')}><ArrowLeft size={15} /> Back to sign in</button>
          <p className="auth-secure-note"><ShieldCheck size={14} /> Never share your activation PIN with anyone.</p>
        </section>
      </main>
    </div>
  )
}
