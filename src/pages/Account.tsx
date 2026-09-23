import { useState, useEffect, useRef, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { User, Download, Settings, HelpCircle, Info, ChevronRight, Crown, LogOut, Edit3, Camera, Loader2 } from 'lucide-react'
import './Account.css'
import { API_URL } from '../config'

type Props = { setActivePage: (page: string) => void }

export default function Account({ setActivePage }: Props) {
  const { user, logout, updateAvatar } = useAuth()
  const [name, setName] = useState(user?.username || 'User')
  const [email, setEmail] = useState(user?.email || '')
  const [photoURL, setPhotoURL] = useState(user?.profile_image || '')
  const [practiced, setPracticed] = useState(0)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const subscription = 'Free Plan'

  useEffect(() => {
    if (!user) { setActivePage('landing'); return }
    setName(user.username || 'User')
    setEmail(user.email || '')
    setPhotoURL(user.profile_image || '')
    fetch(`${API_URL}/api/history/${user.user_id}`)
    .then(r => r.json())
    .then(data => {
       const onlyExams = Array.isArray(data)? data.filter((h:any)=>h.mode!=='study') : []
       setPracticed(onlyExams.length)
     })
    .catch(() => setPracticed(0))
  }, [user])

  const handleEditName = async () => {
    const n = prompt("Enter new name", name)
    if (!n) return
    setName(n)
    const updated = {...user, username: n }
    localStorage.setItem('cbt_user', JSON.stringify(updated))
    try {
      await fetch(`${API_URL}/api/update-user/${user.user_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: n })
      })
    } catch {}
  }

  const handleAvatarClick = () => fileRef.current?.click()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if(!file) return
    if(file.size > 2*1024*1024){ alert("Image too large, max 2MB"); return }
    setUploading(true)
    const result = await updateAvatar(file)
    setUploading(false)
    if(result.success){
      setPhotoURL(result.url) // result.url is already full permanent URL
    } else {
      alert(result.message || "Upload failed")
    }
  }

  const handleLogout = async () => {
    if (confirm("Logout?")) { logout(); setActivePage('landing') }
  }

  // === FIXED PERMANENT AVATAR URL ===
  const displayAvatar = useMemo(() => {
    const img = photoURL
    if (!img) return ''
    if (img.startsWith('http')) return img
    if (img.startsWith('/uploads')) return `${API_URL}${img}`
    if (img.startsWith('avatars/') || img.startsWith('questions/')) return `${API_URL}/uploads/${img}`
    return `${API_URL}/uploads/avatars/${img}`
  }, [photoURL])

  const menuItems = [
    { id: 'profile', label: 'Edit Profile', icon: User, desc: 'Update your name', action: handleEditName },
    { id: 'download', label: 'Practice History', icon: Download, desc: `${practiced} exams from Flask DB`, action: () => setActivePage('practiceHistory') },
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
        <div className="profile-avatar" style={{ position: 'relative', padding: 0, overflow: 'hidden', width: 70, height: 70, cursor:'pointer' }} onClick={handleAvatarClick}>
          {displayAvatar? (
            <img src={displayAvatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
          ) : (
            <span style={{ fontSize: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', background: '#1d4be3', color: '#fff', borderRadius: '50%' }}>{name.charAt(0).toUpperCase()}</span>
          )}
          <label style={{ position: 'absolute', bottom: -2, right: -2, background: '#1d4be3', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid #121212' }}>
            {uploading? <Loader2 size={14} color="#fff" className="spin" /> : <Camera size={14} color="#fff" />}
          </label>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
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