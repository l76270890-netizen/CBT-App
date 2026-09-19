import { useState } from 'react'
import { createUserWithEmailAndPassword, updateProfile, signInWithPopup } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { auth, db, googleProvider } from '../firebase'
import './Auth.css'

export default function Register({ setActivePage }: { setActivePage: (p: string) => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async () => {
    setError('')
    if (!name || !email || !password) return setError('Fill all fields')
    if (password !== confirm) return setError('Passwords do not match')
    if (password.length < 6) return setError('Password must be 6+ characters')
    setLoading(true)
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(cred.user, { displayName: name })
      await setDoc(doc(db, 'users', cred.user.uid), {
        name,
        email,
        createdAt: new Date().toISOString(),
      })
      setActivePage('home')
    } catch (e: any) {
      setError(e.code === 'auth/email-already-in-use' ? 'Email already exists' : e.message)
    }
    setLoading(false)
  }

  const handleGoogle = async () => {
    try {
      const cred = await signInWithPopup(auth, googleProvider)
      await setDoc(doc(db, 'users', cred.user.uid), {
        name: cred.user.displayName,
        email: cred.user.email,
        createdAt: new Date().toISOString(),
      }, { merge: true })
      setActivePage('home')
    } catch (e: any) {
      setError(e.message)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-header">
        <div className="auth-logo">E</div>
        <div className="auth-brand">EXAMCORE</div>
      </div>
      <div className="register-card">
        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">Start your CBT journey today</p>
        <div className="auth-form">
          {error && <div className="auth-error">{error}</div>}
          <div className="input-group"><label>Full Name</label><input className="auth-input" value={name} onChange={e => setName(e.target.value)} placeholder="Lawrence John" /></div>
          <div className="input-group"><label>Email Address</label><input className="auth-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" type="email" /></div>
          <div className="input-group"><label>Password</label><input className="auth-input" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" type="password" /></div>
          <div className="input-group"><label>Confirm Password</label><input className="auth-input" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" type="password" /></div>
          <button className="auth-btn-primary" onClick={handleRegister} disabled={loading}>
            {loading ? 'Creating...' : 'Create Account'}
          </button>
          <div className="auth-divider">OR</div>
          <button className="auth-btn-google" onClick={handleGoogle}>
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" width={18} alt="G" /> Continue with Google
          </button>
          <p className="auth-terms">By signing up, you agree to our <b>Terms</b> and <b>Privacy Policy</b></p>
          <div className="auth-footer">Already have an account? <span className="auth-link" onClick={() => setActivePage('login')}>Login</span></div>
        </div>
      </div>
    </div>
  )
}