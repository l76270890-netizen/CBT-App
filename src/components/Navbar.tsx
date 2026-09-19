import { useState, useEffect, useMemo } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc, collection, query, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { Home, FileText, BookOpen, History, User, LogOut, Settings, Bell, Menu, X, ChevronRight, Edit2, CheckCheck, Trash2 } from 'lucide-react'
import './Navbar.css'

type Props = {
  activePage: string
  setActivePage: (page: string) => void
}

type Notification = {
  id: string
  title: string
  message: string
  time: string
  read: boolean
  type: 'info' | 'success' | 'warning'
}

export default function Navbar({ activePage, setActivePage }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [showNotif, setShowNotif] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [user, setUser] = useState<any>(null)
  const [historyCount, setHistoryCount] = useState(0)

  // GET REAL FIREBASE USER + HISTORY COUNT FROM FIREBASE
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const snap = await getDoc(doc(db, 'users', fbUser.uid))
        setUser({
          uid: fbUser.uid,
          name: fbUser.displayName || snap.data()?.name || "User",
          email: fbUser.email,
          photo: fbUser.photoURL || snap.data()?.photoURL || "",
        })

        // LISTEN TO FIREBASE HISTORY COUNT
        const q = query(collection(db, `users/${fbUser.uid}/history`))
        const unsubHist = onSnapshot(q, (s) => {
          setHistoryCount(s.size)
        })
        return () => unsubHist()
      } else {
        setUser(null)
        setHistoryCount(0)
      }
    })
    return () => unsubAuth()
  }, [])

  const navItems = [
    { id: 'home', label: 'Home', icon: Home, mobileLabel: 'Home' },
    { id: 'exams', label: 'Exams', icon: FileText, mobileLabel: 'Exams' },
    { id: 'classroom', label: 'Study', icon: BookOpen, mobileLabel: 'Study' },
    { id: 'practiceHistory', label: 'History', icon: History, mobileLabel: 'History' },
    { id: 'account', label: 'Account', icon: User, mobileLabel: 'Account' },
  ]
  const extraItems = [
    { id: 'admin', label: 'Admin Dashboard', icon: Settings },
    { id: 'logout', label: 'Log out', icon: LogOut, danger: true },
  ]

  useEffect(() => {
    const saved = localStorage.getItem('notifications')
    if (saved) { try { setNotifications(JSON.parse(saved)) } catch {} return }
    setNotifications([
      { id: '1', title: 'Welcome to YOURCBT!', message: `Hi ${user?.name || ''} Start your first test today!`, time: 'Just now', read: false, type: 'info' },
      { id: '2', title: 'New Feature', message: 'Study mode now shows answers instantly.', time: '2h ago', read: false, type: 'success' },
    ])
  }, [user])

  useEffect(() => {
    if (notifications.length > 0) localStorage.setItem('notifications', JSON.stringify(notifications))
  }, [notifications])

  useEffect(() => {
    document.body.style.overflow = menuOpen || showNotif? 'hidden' : 'auto'
    return () => { document.body.style.overflow = 'auto' }
  }, [menuOpen, showNotif])

  const unreadCount = useMemo(() => notifications.filter(n =>!n.read).length, [notifications])

  const handleNavClick = async (id: string) => {
    if (id === 'logout') {
      if (confirm("Logout?")) {
        await signOut(auth)
        setActivePage('landing')
      }
      return
    }
    setActivePage(id)
    setMenuOpen(false)
    setShowNotif(false)
  }

  const avatarUrl = user?.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=1d4be3&color=fff&bold=true`

  return (
    <>
      <header className="navbar">
        <div className="navbar-container">
          <button className="hamburger" onClick={() => setMenuOpen(true)}><Menu size={20} /></button>
          <div className="navbar-logo">YOUR<span>CBT</span></div>
          <nav className="nav-links">
            {navItems.map(item => {
              const Icon = item.icon
              return <button key={item.id} className={`nav-link ${activePage === item.id? 'active' : ''}`} onClick={() => handleNavClick(item.id)}><Icon size={18} /> {item.label}</button>
            })}
          </nav>
          <div className="navbar-right" style={{ position: 'relative' }}>
            <button className="bell-btn" onClick={() => setShowNotif(!showNotif)}>
              <Bell size={20} />
              {unreadCount > 0 && <span className="bell-dot">{unreadCount > 9? '9+' : unreadCount}</span>}
            </button>
            {showNotif && (
              <div className="notif-panel">
                <div className="notif-header">
                  <h4>Notifications {unreadCount > 0 && <span className="notif-badge">{unreadCount} new</span>}</h4>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setNotifications(p => p.map(n => ({...n, read: true })))} className="notif-icon-btn"><CheckCheck size={18} /></button>
                    <button onClick={() => { if(confirm("Clear all?")) setNotifications([]) }} className="notif-icon-btn danger"><Trash2 size={16} /></button>
                  </div>
                </div>
                <div className="notif-body">
                  {notifications.length === 0? <div className="notif-empty"><Bell size={32} /><p>No notifications</p></div> : notifications.map(n => (
                    <div key={n.id} onClick={() => setNotifications(p => p.map(x => x.id === n.id? {...x, read: true} : x))} className={`notif-item ${!n.read? 'unread' : ''}`}>
                      <div className={`notif-type ${n.type}`}></div>
                      <div style={{ flex: 1 }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><b>{n.title}</b><span className="notif-time">{n.time}</span></div><p className="notif-msg">{n.message}</p></div>
                      {!n.read && <span className="notif-dot"></span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {showNotif && <div className="overlay transparent" onClick={() => setShowNotif(false)}></div>}
      <div className={`sidebar-overlay ${menuOpen? 'show' : ''}`} onClick={() => setMenuOpen(false)}></div>

      <aside className={`sidebar ${menuOpen? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="profile-section">
            <div className="avatar"><img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /></div>
            <div className="profile-text">
              <h3>{user?.name || 'Loading...'}</h3>
              <span style={{ fontSize: 12, opacity: 0.7 }}>{user?.email || ''}</span>
              <span>Free Plan • {historyCount} Tests</span>
            </div>
            <button className="edit-profile" onClick={() => handleNavClick('account')}><Edit2 size={12} /> Edit</button>
          </div>
          <button className="close-btn" onClick={() => setMenuOpen(false)}><X size={20} /></button>
        </div>
        <nav className="sidebar-links">
          {navItems.map(item => {
            const Icon = item.icon
            return <button key={item.id} className={`sidebar-link ${activePage === item.id? 'active' : ''}`} onClick={() => handleNavClick(item.id)}><span className="sidebar-icon"><Icon size={18} /></span>{item.label}<ChevronRight size={16} className="chevron" /></button>
          })}
          <div className="sidebar-divider"></div>
          {extraItems.map(item => {
            const Icon = item.icon
            return <button key={item.id} className={`sidebar-link ${item.danger? 'danger' : 'muted'}`} onClick={() => handleNavClick(item.id)}><span className="sidebar-icon"><Icon size={18} /></span>{item.label}</button>
          })}
        </nav>
        <div className="sidebar-footer">YOURCBT v1.0 • {user?.name} • {historyCount} Tests 🇳🇬</div>
      </aside>

      <nav className="bottom-nav">
        {navItems.map(item => {
          const Icon = item.icon
          return <button key={item.id} className={`nav-item ${activePage === item.id? 'active' : ''}`} onClick={() => handleNavClick(item.id)}><span className="nav-icon-wrap"><Icon size={22} /></span><span className="nav-label">{item.mobileLabel}</span></button>
        })}
      </nav>
    </>
  )
}