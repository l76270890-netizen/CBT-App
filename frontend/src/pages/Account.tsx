import { useState, useEffect, useRef, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { useSubscription } from '../context/SubscriptionContext'
import { useTheme } from '../theme'
import {
  User,
  Download,
  Settings,
  Shield,
  HelpCircle,
  Info,
  ChevronRight,
  Crown,
  LogOut,
  Edit3,
  Camera,
  Loader2,
  Trash2,
  KeyRound,
  ShieldCheck,
  Sun,
  Moon,
} from 'lucide-react'
import './Account.css'
import { API_URL } from '../config'
import { apiRequest, asArray } from '../api'

type Props = {
  setActivePage: (page: string) => void
}

export default function Account({ setActivePage }: Props) {
  const { user, logout, updateAvatar, setUserData } = useAuth()
  const { status, isOwner: subIsOwner } = useSubscription()
  const { theme, setTheme } = useTheme()

  const [name, setName] = useState(user?.username || 'User')
  const [email, setEmail] = useState(user?.email || '')
  const [photoURL, setPhotoURL] = useState(user?.profile_image || '')
  const [practiced, setPracticed] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [ownerEligible, setOwnerEligible] = useState(false)
  const [ownerActive, setOwnerActive] = useState(!!(user?.is_owner || user?.owner_access || user?.role === 'owner'))
  const [ownerPin, setOwnerPin] = useState('')
  const [ownerPinLoading, setOwnerPinLoading] = useState(false)
  const [ownerPinError, setOwnerPinError] = useState('')
  const [ownerPinSuccess, setOwnerPinSuccess] = useState('')

  const fileRef = useRef<HTMLInputElement>(null)
  const isOwner = ownerActive || subIsOwner
  const subscription = isOwner ? 'Owner Access' : (status?.active ? (status.plan ? `${status.plan.charAt(0).toUpperCase() + status.plan.slice(1)} Plan` : 'Active Plan') : 'Free Plan')

  useEffect(() => {
    if (!user) {
      setActivePage('landing')
      return
    }

    setName(user.username || 'User')
    setEmail(user.email || '')
    setPhotoURL(user.profile_image || '')

    let cancelled = false

    apiRequest<unknown>(
      `/api/history/${encodeURIComponent(user.user_id)}`
    )
      .then((payload) => {
        if (cancelled) return
        const data = asArray<any>(payload)
        const onlyExams = Array.isArray(data)
          ? data.filter((h: any) => h.mode !== 'study')
          : []
        setPracticed(onlyExams.length)
      })
      .catch(() => {
        if (!cancelled) setPracticed(0)
      })

    // Check owner access status for the signed-in account (backend-verified).
    apiRequest<any>('/api/owner/status').then((payload) => {
      if (cancelled) return
      const eligible = !!payload?.eligible
      const active = !!(payload?.owner_access || payload?.is_owner)
      setOwnerEligible(eligible)
      setOwnerActive(active)
      if (active && !(user?.is_owner || user?.owner_access)) {
        const updated = { ...user, is_owner: true, owner_access: true, role: 'owner', account_status: 'active', subscription_active: true }
        localStorage.setItem('cbt_user', JSON.stringify(updated))
        setUserData(updated)
      }
    }).catch(() => {
      if (!cancelled) {
        setOwnerEligible(false)
        setOwnerActive(!!(user?.is_owner || user?.owner_access || user?.role === 'owner'))
      }
    })

    return () => {
      cancelled = true
    }
  }, [user, setActivePage, setUserData])

  const handleActivateOwnerAccess = async () => {
    if (!ownerPin.trim() || ownerPinLoading) return
    setOwnerPinLoading(true)
    setOwnerPinError('')
    setOwnerPinSuccess('')
    try {
      const res = await apiRequest<any>('/api/owner/activate', {
        method: 'POST',
        body: JSON.stringify({ pin: ownerPin.trim() }),
      })
      if (!res?.success) throw new Error(res?.error || 'Could not activate owner access.')
      setOwnerActive(true)
      setOwnerPin('')
      setOwnerPinSuccess('Owner Access activated. Permanent access is enabled for this account.')
      const updated = { ...(user || {}), is_owner: true, owner_access: true, role: res.role || 'owner', account_status: res.account_status || 'active', subscription_active: true }
      localStorage.setItem('cbt_user', JSON.stringify(updated))
      setUserData(updated)
    } catch (e) {
      setOwnerPinError(e instanceof Error ? e.message : 'Could not activate owner access.')
    } finally {
      setOwnerPinLoading(false)
    }
  }

  const handleEditName = async () => {
    if (!user) return
    const n = prompt('Enter new name', name)
    if (n === null || !n.trim()) return
    const newName = n.trim()
    try {
      const response = await fetch(
        `${API_URL}/api/update-user/${user.user_id}`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: newName }),
        }
      )
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not update your name.')
      setName(data.username || newName)
      const updated = { ...user, username: data.username || newName }
      localStorage.setItem('cbt_user', JSON.stringify(updated))
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not update your name.')
    }
  }

  const handleAvatarClick = () => {
    if (!uploading) fileRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      alert('Image too large, max 2MB')
      e.target.value = ''
      return
    }
    setUploading(true)
    try {
      const result = await updateAvatar(file)
      if (result.success) {
        setPhotoURL(result.url)
      } else {
        alert(result.message || 'Upload failed')
      }
    } catch {
      alert('Avatar upload failed. Please try again.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleLogout = async () => {
    if (!confirm('Are you sure you want to logout?')) return
    try {
      await logout()
    } catch {
      // Clear local state even if the logout request fails.
    } finally {
      localStorage.removeItem('cbt_user')
      setActivePage('landing')
    }
  }

  const handleDeleteAccount = async () => {
    if (!user || deletingAccount) return
    const confirmed = confirm(
      'Are you sure you want to permanently delete your account? Your practice history and exam attempts will also be deleted. This action cannot be undone.'
    )
    if (!confirmed) return
    const password = prompt('Enter your current password to confirm account deletion:')
    if (password === null) return
    if (!password.trim()) {
      alert('Your password is required.')
      return
    }
    setDeletingAccount(true)
    try {
      const response = await fetch(`${API_URL}/api/user/delete-account`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Account deletion failed.')
      localStorage.removeItem('cbt_user')
      setActivePage('landing')
      alert(data.message || 'Your account has been permanently deleted.')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not delete your account. Please try again.')
    } finally {
      setDeletingAccount(false)
    }
  }

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
    { id: 'download', label: 'Practice History', icon: Download, desc: `${practiced} exams completed`, action: () => setActivePage('practiceHistory') },
    { id: 'settings', label: 'Settings', icon: Settings, desc: 'Notifications and preferences', action: () => alert('More settings coming soon') },
    { id: 'admin', label: 'Admin Dashboard', icon: Shield, desc: 'Manage exams and students', action: () => setActivePage('admin') },
    { id: 'help', label: 'Help & Support', icon: HelpCircle, desc: 'Chat with us', action: () => window.open('https://wa.me/2340000000000', '_blank', 'noopener,noreferrer') },
    { id: 'about', label: 'About Us', icon: Info, desc: 'Version 2.0 • EXAMCORE', action: () => alert('EXAMCORE v2 • Made for Nigerian students 🇳🇬') },
  ]

  if (!user) return null

  return (
    <div className="account-page">
      <div className="account-header">
        <h1>Account</h1>
        <button className="edit-btn" onClick={handleEditName}>
          <Edit3 size={16} />
          Edit
        </button>
      </div>

      <div className="profile-card">
        <div
          className="profile-avatar"
          style={{ position: 'relative', padding: 0, overflow: 'hidden', width: 70, height: 70, cursor: uploading ? 'wait' : 'pointer' }}
          onClick={handleAvatarClick}
        >
          {displayAvatar ? (
            <img src={displayAvatar} alt="Profile avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
          ) : (
            <span style={{ fontSize: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', background: '#1d4be3', color: '#fff', borderRadius: '50%' }}>
              {name.charAt(0).toUpperCase()}
            </span>
          )}
          <span style={{ position: 'absolute', bottom: -2, right: -2, background: 'var(--primary, #1d4be3)', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg-main, #121212)' }}>
            {uploading ? <Loader2 size={14} color="#fff" className="spin" /> : <Camera size={14} color="#fff" />}
          </span>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" hidden onChange={handleFileChange} disabled={uploading} />
        </div>

        <div className="profile-info">
          <h2>{name}</h2>
          <p>{email}</p>
          <div className="badge-row">
            <span className={`subscription-badge${isOwner ? ' owner-badge' : ''}`}>
              {isOwner ? <><Crown size={10} style={{ marginRight: 4 }} /> Owner Access</> : subscription}
            </span>
            <span className="stat-mini">{practiced} Tests</span>
          </div>
        </div>
      </div>

      <div className="appearance-card">
        <div className="appearance-head">
          <div className="appearance-icon"><Sun size={18} /></div>
          <div>
            <h3>Appearance</h3>
            <p>Choose Light or Dark mode. Your preference is saved on this device.</p>
          </div>
        </div>
        <div className="theme-toggle" role="group" aria-label="Appearance">
          <button
            type="button"
            className={`theme-toggle-btn${theme === 'light' ? ' active' : ''}`}
            onClick={() => setTheme('light')}
            aria-pressed={theme === 'light'}
          >
            <Sun size={16} />
            Light
          </button>
          <button
            type="button"
            className={`theme-toggle-btn${theme === 'dark' ? ' active' : ''}`}
            onClick={() => setTheme('dark')}
            aria-pressed={theme === 'dark'}
          >
            <Moon size={16} />
            Dark
          </button>
        </div>
      </div>

      {isOwner && (
        <div className="owner-access-card" role="status">
          <div className="owner-access-left">
            <div className="owner-access-icon"><ShieldCheck size={20} /></div>
            <div>
              <h3>Owner Access Active</h3>
              <p>Permanent, unrestricted access to all exams, subjects, study/practice, tests, and explanations. No subscription or expiry applies to this account.</p>
            </div>
          </div>
        </div>
      )}

      {!isOwner && ownerEligible && (
        <div className="owner-activate-card">
          <div className="owner-activate-head">
            <div className="owner-access-icon"><KeyRound size={20} /></div>
            <div>
              <h3>Activate Owner Access</h3>
              <p>Enter your private Owner Access PIN to enable permanent, unrestricted access for this account. This is required once.</p>
            </div>
          </div>
          <div className="owner-activate-form">
            <input
              type="password"
              className="owner-pin-input"
              placeholder="Owner Access PIN"
              value={ownerPin}
              onChange={(e) => setOwnerPin(e.target.value)}
              autoComplete="off"
              disabled={ownerPinLoading}
            />
            <button type="button" className="owner-activate-btn" onClick={handleActivateOwnerAccess} disabled={ownerPinLoading || !ownerPin.trim()}>
              {ownerPinLoading ? <Loader2 size={16} className="spin" /> : <ShieldCheck size={16} />}
              {ownerPinLoading ? 'Verifying...' : 'Activate'}
            </button>
          </div>
          {ownerPinError && <p className="owner-pin-msg error" role="alert">{ownerPinError}</p>}
          {ownerPinSuccess && <p className="owner-pin-msg success">{ownerPinSuccess}</p>}
          <p className="owner-pin-note">PIN is verified securely on the server and never stored in the browser. Never share it.</p>
        </div>
      )}

      <div className="account-menu">
        {menuItems.map((item) => {
          const Icon = item.icon
          return (
            <button key={item.id} className="menu-row" onClick={item.action}>
              <div className="menu-left">
                <div className="menu-icon-wrap"><Icon size={18} /></div>
                <div>
                  <div className="menu-label">{item.label}</div>
                  <div className="menu-desc">{item.desc}</div>
                </div>
              </div>
              <ChevronRight size={18} className="menu-chevron" />
            </button>
          )
        })}
      </div>

      {!isOwner && (
        <div className="upgrade-card">
          <div className="upgrade-left">
            <div className="crown-icon"><Crown size={20} /></div>
            <div>
              <h3>Upgrade to Pro</h3>
              <p>Unlock all questions • No ads</p>
            </div>
          </div>
          <button className="btn-upgrade" onClick={() => setActivePage('renew')}>UPGRADE</button>
        </div>
      )}

      <button className="btn-logout" onClick={handleLogout}>
        <LogOut size={16} />
        Logout
      </button>

      <button type="button" className="btn-delete-account" onClick={handleDeleteAccount} disabled={deletingAccount}>
        {deletingAccount ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
        {deletingAccount ? 'Deleting Account...' : 'Delete Account'}
      </button>

      <p className="footer-text">Made for Nigerian Students • {email}</p>
    </div>
  )
}
