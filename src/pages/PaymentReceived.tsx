import { ArrowRight, MailCheck, ShieldCheck } from 'lucide-react'
import './Auth.css'

export default function PaymentReceived({ setActivePage }: { setActivePage: (page: string) => void }) {
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
          <span className="auth-activation-icon"><MailCheck size={23} /></span>
          <div className="auth-card-eyebrow">PAYMENT RETURN</div>
          <h1 className="auth-title">Check your email</h1>
          <p className="auth-subtitle">If your payment was successful, we’ll email your activation PIN after the payment is verified.</p>
          <div className="payment-unavailable payment-return-note" role="status">
            <ShieldCheck size={18} />
            <p>Returning from Paystack does not confirm payment. Your account is activated only after you submit a valid PIN issued by our server.</p>
          </div>
          <button type="button" className="auth-btn-primary" onClick={() => setActivePage('activation')}>
            Enter activation PIN <ArrowRight size={17} />
          </button>
          <p className="auth-secure-note"><MailCheck size={14} /> Check your inbox and spam folder for the PIN email.</p>
        </section>
      </main>
    </div>
  )
}
