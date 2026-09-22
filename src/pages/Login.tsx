import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import './Auth.css'

export default function Login({ setActivePage }: { setActivePage: (p: string) => void }) {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async () => {
    setError('')
    if (!email || !password) return setError('Fill all fields')
    
    setIsLoading(true)
    try {
      // Use AuthContext login which calls Flask and saves email
      const result = await login(email, password)
      
      if (result.success) {
        setActivePage('home')
        window.location.reload() // force navbar to update with email
      } else {
        setError(result.message || 'Login failed')
      }
    } catch (e: any) {
      setError(e.message || 'Login failed - is Flask running on 5000?')
    }
    setIsLoading(false)
  }

  return (
    <div className="auth-page">
      <div className="auth-header">
        <div className="auth-logo">E</div>
        <div className="auth-brand">EXAMCORE</div>
      </div>
      <div className="login-card">
        <h1 className="auth-title">Welcome Back!</h1>
        <p className="auth-subtitle">Login to continue your practice</p>
        <div className="auth-form">
          {error && <div className="auth-error">{error}</div>}
          
          <div className="input-group">
            <label>Email Address</label>
            <input 
              className="auth-input" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="you@example.com" 
              type="email" 
            />
          </div>
          
          <div className="input-group">
            <label>Password</label>
            <input 
              className="auth-input" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="••••••••" 
              type="password" 
            />
          </div>
          
          <button 
            className="auth-btn-primary" 
            onClick={handleLogin} 
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
          
          <div className="auth-footer">
            Don't have an account? <span className="auth-link" onClick={() => setActivePage('register')}>Register</span>
          </div>
        </div>
      </div>
    </div>
  )
}