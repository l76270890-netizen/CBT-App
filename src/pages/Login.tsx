import { useState, type FormEvent } from 'react'
import { ArrowRight, BookOpenCheck, ChartNoAxesColumnIncreasing, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './Auth.css'

export default function Login({ setActivePage }: { setActivePage: (p: string) => void }) {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (!email || !password) return setError('Fill all fields')

    setIsLoading(true)
    try {
      const result = await login(email, password)
      if (result.success) {
        setActivePage('home')
        window.location.reload()
      } else {
        setError(result.message || 'Login failed')
      }
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Login failed - check your connection and try again')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-page auth-login-page">
      <aside className="auth-showcase">
        <div className="auth-showcase-brand">
          <img className="auth-logo" src="/icons/examcore-192.png" alt="" />
          <span>EXAMCORE</span>
        </div>
        <div className="auth-showcase-copy">
          <span className="auth-kicker"><span /> YOUR NEXT RESULT STARTS HERE</span>
          <h1>Practice with purpose.<br /><span>Go in confident.</span></h1>
          <p>Prepare for your next exam with focused practice, instant results, and tools that help you see how far you’ve come.</p>
          <div className="auth-feature-list">
            <div><BookOpenCheck size={19} /><span><strong>Exam-ready practice</strong><small>Prepare with the subjects that matter.</small></span></div>
            <div><ChartNoAxesColumnIncreasing size={19} /><span><strong>Track your progress</strong><small>Learn from every practice session.</small></span></div>
            <div><ShieldCheck size={19} /><span><strong>Your account, your progress</strong><small>Sign in securely to continue learning.</small></span></div>
          </div>
        </div>
        <p className="auth-showcase-footnote">A smarter way to prepare for JAMB, WAEC, NECO and more.</p>
      </aside>

      <main className="auth-main">
        <div className="auth-mobile-brand">
          <img className="auth-logo" src="/icons/examcore-192.png" alt="" />
          <span>EXAMCORE</span>
        </div>
        <section className="auth-card login-card">
          <div className="auth-card-eyebrow">WELCOME BACK</div>
          <h2 className="auth-title">Sign in to your account</h2>
          <p className="auth-subtitle">Continue your preparation right where you left off.</p>

          <form className="auth-form" onSubmit={handleLogin}>
            {error && <div className="auth-error" role="alert">{error}</div>}
            <div className="input-group">
              <label htmlFor="login-email">Email Address</label>
              <input
                id="login-email"
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
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                className="auth-input"
                value={password}
                onChange={event => setPassword(event.target.value)}
                placeholder="Enter your password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            <button className="auth-btn-primary" type="submit" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'} {!isLoading && <ArrowRight size={17} />}
            </button>
          </form>

          <div className="auth-footer auth-switch">
            Don’t have an account? <button type="button" className="auth-link" onClick={() => setActivePage('register')}>Create Account</button>
          </div>
          <button type="button" className="auth-activation-link" onClick={() => setActivePage('activation')}>Have an activation PIN?</button>
          <div className="auth-demo">
            <div>
              <strong>Want to explore before subscribing?</strong>
              <p>Explore our CBT platform with a free demo account.</p>
            </div>
            <button type="button" onClick={() => setActivePage('demo')}>Try Free Demo</button>
          </div>
        </section>
        <p className="auth-secure-note"><ShieldCheck size={14} /> Your sign-in is protected by your school account.</p>
      </main>
    </div>
  )
}
