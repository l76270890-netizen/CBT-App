import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { User, Download, Settings, HelpCircle, Info, ChevronRight, Crown, LogOut, Edit3, Camera } from 'lucide-react'
import './Account.css'

type Props = { setActivePage: (page: string) => void }

export default function Account({ setActivePage }: Props) {
  const { user, logout } = useAuth()
  const [name, setName] = useState(user?.username || 'User')
  const [email, setEmail] = useState(user?.email || '')
  const [photoURL, setPhotoURL] = useState('')
  const [practiced, setPracticed] = useState(0)
  const subscription = 'Free Plan'

  useEffect(() => {
    if (!user) {
      setActivePage('landing')
      return
    }
    setName(user.username || 'User')
    setEmail(user.email || '')

    // Flask history count
    fetch(`http://127.0.0.1:5000/api/history/${user.user_id}`)
      .then(r => r.json())
      .then(data => setPracticed(data.length))
      .catch(() => setPracticed(0))
  }, [user])

  const handleEditName = async () => {
    const n = prompt("Enter new name", name)
    if (!n) return
    setName(n)
    // save to localStorage + Flask
    const updated = { ...user, username: n }
    localStorage.setItem('cbt_user', JSON.stringify(updated))
    // optional: call Flask update
    try {
      await fetch(`http://127.0.0.1:5000/api/update-user/${user.user_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: n })
      })
    } catch {}
  }

  const handleLogout = async () => {
    if (confirm("Logout?")) {
      logout()
      setActivePage('landing')
    }
  }

  const menuItems = [
    { id: 'profile', label: 'Edit Profile', icon: User, desc: 'Update your name', action: handleEditName },
    { id: 'download', label: 'Practice History', icon: Download, desc: `${practiced} tests from Flask DB`, action: () => setActivePage('practiceHistory') },
    { id: 'settings', label: 'Settings', icon: Settings, desc: 'Theme, notifications', action: () => alert('Settings coming soon') },
    { id: 'help', label: 'Help & Support', icon: HelpCircle, desc: 'Chat with us', action: () => window.open('https://wa.me/2340000000000', '_blank') },
    { id: 'about', label: 'About Us', icon: Info, desc: 'Version 2.0 Flask • EXAMCORE', action: () => alert('EXAMCORE v2 - Flask + React 🇳🇬') },
  ]

  if (!user) return null

  return (
    <div className="account-page">
      <div className="account-header">
        <h1>Account</h1>
        <button className="edit-btn" onClick={handleEditName}><Edit3 size={16}/> Edit</button>
      </div>

      <div className="profile-card">
        <div className="profile-avatar" style={{ position: 'relative', padding: 0, overflow: 'hidden', width: 70, height: 70 }}>
          {photoURL ? (
            <img src={photoURL} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
          ) : (
            <span style={{ fontSize: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', background: '#1d4be3', color: '#fff', borderRadius: '50%' }}>{name.charAt(0).toUpperCase()}</span>
          )}
          <label style={{ position: 'absolute', bottom: -2, right: -2, background: '#1d4be3', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid #121212' }}><Camera size={14} color="#fff" /></label>
        </div>

        <div className="profile-info">
          <h2>{name}</h2>
          <p>{email}</p>
          <div className="badge-row">
            <span className="subscription-badge">{subscription}</span>
            <span className="stat-mini">{practiced} Tests</span>
          </div>
        </div>
      </div>

      <div className="account-menu">
        {menuItems.map(item => {
          const Icon = item.icon
          return (
            <button key={item.id} className="menu-row" onClick={item.action}>
              <div className="menu-left"><div className="menu-icon-wrap"><Icon size={18}/></div><div><div className="menu-label">{item.label}</div><div className="menu-desc">{item.desc}</div></div></div>
              <ChevronRight size={18} className="menu-chevron" />
            </button>
          )
        })}
      </div>

      <div className="upgrade-card">
        <div className="upgrade-left"><div className="crown-icon"><Crown size={20}/></div><div><h3>Upgrade to Pro</h3><p>Unlock all questions • Flask DB • No ads</p></div></div>
        <button className="btn-upgrade" onClick={() => alert('Pro coming soon - ₦2000/year')}>UPGRADE</button>
      </div>

      <button className="btn-logout" onClick={handleLogout}><LogOut size={16}/> Logout</button>
      <p className="footer-text">Flask + React • Made for Nigerian Students • {email}</p>
    </div>
  )
}