import { ArrowRight, LockKeyhole, LogOut, RefreshCw, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useSubscription } from '../context/SubscriptionContext'
import { formatExpiryDate } from '../subscription'
import './Auth.css'

export default function SubscriptionExpired({ setActivePage }: { setActivePage: (page: string) => void }) {
  const { user, logout } = useAuth()
  const { status, loading, refresh } = useSubscription()

  const handleLogout = () => {
    logout()
    setActivePage('landing')
  }

  return (
    <div className="auth-page auth-activation-page">
      <header className="auth-register-header">
        <button type="button" className="auth-register-brand" onClick={() => setActivePage('landing')}>
          <img className="auth-logo" src="/icons/examcore-192.png" alt="" />
          <span>EXAMCORE</span>
        </button>
        <button type="button" className="auth-link" onClick={handleLogout}>Sign out</button>
      </header>
      <main className="auth-activation-main">
        <section className="auth-card auth-activation-card">
          <span className="auth-activation-icon"><LockKeyhole size={23} /></span>
          <div className="auth-card-eyebrow">SUBSCRIPTION EXPIRED</div>
          <h1 className="auth-title">Your access has ended</h1>
          <p className="auth-subtitle">
            {user?.email ? `${user.email} no longer has an active subscription.` : 'Your subscription is no longer active.'}{' '}
            Renew to unlock practice tests, study mode and your history again.
          </p>
          {status?.expiresAt && (
            <p className="auth-activation-instructions">Expired on {formatExpiryDate(status.expiresAt)}.</p>
          )}
          <div className="payment-unavailable payment-return-note" role="status">
            <ShieldCheck size={18} />
            <p>Your progress is safe. Everything is restored as soon as your renewal is activated.</p>
          </div>
          <button type="button" className="auth-btn-primary" onClick={() => setActivePage('renew')}>
            Renew subscription <ArrowRight size={17} />
          </button>
          <button type="button" className="auth-back-link" onClick={() => { void refresh() }} disabled={loading}>
            <RefreshCw size={15} /> {loading ? 'Checking access...' : 'I have already renewed'}
          </button>
          <button type="button" className="auth-back-link" onClick={handleLogout}>
            <LogOut size={15} /> Sign out
          </button>
          <p className="auth-secure-note"><ShieldCheck size={14} /> Access is restored only after the server verifies your renewal.</p>
        </section>
      </main>
    </div>
  )
}
