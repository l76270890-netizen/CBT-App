import { useState, type FormEvent } from 'react'
import { ArrowLeft, KeyRound, ShieldCheck } from 'lucide-react'
import './Auth.css'

export default function Activation({ setActivePage }: { setActivePage: (page: string) => void }) {
  const [pin, setPin] = useState('')
  const [message, setMessage] = useState('')

  const handleActivate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(pin.trim()
      ? 'PIN activation is not connected yet. Activation will be available after subscription payments are set up.'
      : 'Enter the activation PIN provided after payment.')
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
          <p className="auth-subtitle">Enter the activation PIN provided after your subscription payment.</p>
          <form className="auth-form" onSubmit={handleActivate}>
            <div className="input-group">
              <label htmlFor="activation-pin">Activation PIN</label>
              <input
                id="activation-pin"
                className="auth-input auth-pin-input"
                value={pin}
                onChange={event => { setPin(event.target.value); setMessage('') }}
                placeholder="CBT-A82K-9P5M"
                autoComplete="one-time-code"
                aria-describedby="activation-instructions"
                required
              />
            </div>
            <p className="auth-activation-instructions" id="activation-instructions">Your PIN will be provided after successful subscription payment. PIN verification is not available yet.</p>
            {message && <div className="auth-error auth-info" role="status">{message}</div>}
            <button type="submit" className="auth-btn-primary">Activate Account</button>
          </form>
          <button type="button" className="auth-back-link" onClick={() => setActivePage('register')}><ArrowLeft size={15} /> Back to registration</button>
          <p className="auth-secure-note"><ShieldCheck size={14} /> Never share your activation PIN with anyone.</p>
        </section>
      </main>
    </div>
  )
}
