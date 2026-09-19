import { useState } from 'react'
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth'
import { auth, db, googleProvider } from '../firebase'
import './Auth.css'
import { setDoc } from '@firebase/firestore'
import { doc } from 'firebase/firestore/lite'

export default function Login({ setActivePage }: { setActivePage: (p: string) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setError('')
    if (!email || !password) return setError('Fill all fields')
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      setActivePage('home')
    } catch (e: any) {
      setError(e.code === 'auth/invalid-credential' ? 'Invalid email or password' : e.message)
    }
    setLoading(false)
  }

const handleGoogle = async () => {
  setError('')
  try {
    // Force logout of previous google session so chooser shows
    googleProvider.setCustomParameters({ prompt: 'select_account' })
    const cred = await signInWithPopup(auth, googleProvider)
    
    // save user
    await setDoc(doc(db, 'users', cred.user.uid), {
      name: cred.user.displayName,
      email: cred.user.email,
      photoURL: cred.user.photoURL,
      createdAt: new Date().toISOString(),
    }, { merge: true })
    
    setActivePage('home')
  } catch (e: any) {
    if(e.code !== 'auth/popup-closed-by-user'){
      setError(e.message)
    }
  }
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
            <input className="auth-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" type="email" />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input className="auth-input" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" type="password" />
          </div>
          <button className="auth-btn-primary" onClick={handleLogin} disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
          <div className="auth-divider">OR</div>
          <button className="auth-btn-google" onClick={handleGoogle}>
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" width={18} alt="G" /> Continue with Google
          </button>
          <div className="auth-footer">
            Don't have an account? <span className="auth-link" onClick={() => setActivePage('register')}>Register</span>
          </div>
        </div>
      </div>
    </div>
  )
}