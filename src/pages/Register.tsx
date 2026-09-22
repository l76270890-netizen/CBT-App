import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import './Auth.css'

export default function Register({ setActivePage }: any) {
  const { register } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleRegister = async () => {
    if(!name || !email || !password) return setError("Fill all")
    setIsLoading(true)
    const res = await register(name, email, password)
    if(res.success){
      setActivePage('home')
      window.location.reload()
    } else {
      setError(res.message)
    }
    setIsLoading(false)
  }

  return (
    <div className="auth-page">
      <div className="auth-header"><div className="auth-logo">E</div><div className="auth-brand">EXAMCORE</div></div>
      <div className="login-card">
        <h1 className="auth-title">Create Account</h1>
        {error && <div className="auth-error">{error}</div>}
        <div className="input-group"><label>Name</label><input className="auth-input" value={name} onChange={e=>setName(e.target.value)} /></div>
        <div className="input-group"><label>Email</label><input className="auth-input" value={email} onChange={e=>setEmail(e.target.value)} type="email" /></div>
        <div className="input-group"><label>Password</label><input className="auth-input" value={password} onChange={e=>setPassword(e.target.value)} type="password" /></div>
        <button className="auth-btn-primary" onClick={handleRegister} disabled={isLoading}>{isLoading?'Creating...':'Register'}</button>
        <div className="auth-footer">Have account? <span className="auth-link" onClick={()=>setActivePage('login')}>Login</span></div>
      </div>
    </div>
  )
}