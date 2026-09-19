import { useState, useEffect, useMemo } from 'react'
import { Home, FileText, BookOpen, History, User, LogOut, Settings, Bell, Menu, X, ChevronRight, Edit2, CheckCheck, Trash2 } from 'lucide-react'
import './Navbar.css'

type Props = {
  activePage: string
  setActivePage: (page: string) => void
  userName?: string
}

type Notification = {
  id: string
  title: string
  message: string
  time: string
  read: boolean
  type: 'info' | 'success' | 'warning'
}

const getHistoryCount = () => {
  try {
    return JSON.parse(localStorage.getItem('practiceHistory') || '[]').length
  } catch {
    return 0
  }
}

export default function Navbar({ activePage, setActivePage, userName = "Lawrence" }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [showNotif, setShowNotif] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])

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
    if (saved) {
      try { setNotifications(JSON.parse(saved)) } catch {}
      return
    }
    const initial: Notification[] = [
      { id: '1', title: 'Welcome to YOURCBT!', message: 'Start your first CBT test today and track your progress.', time: 'Just now', read: false, type: 'info' },
      { id: '2', title: 'New Feature', message: 'Study mode now shows answers instantly. Try it!', time: '2h ago', read: false, type: 'success' },
    ]
    if (getHistoryCount() > 0) {
      initial.unshift({
        id: 'hist-' + Date.now(),
        title: 'Practice Completed',
        message: `You completed ${getHistoryCount()} test(s). Keep it up!`,
        time: 'Today',
        read: false,
        type: 'success'
      })
    }
    setNotifications(initial)
  }, [])

  useEffect(() => {
    if (notifications.length > 0) {
      localStorage.setItem('notifications', JSON.stringify(notifications))
    }
  }, [notifications])

  useEffect(() => {
    document.body.style.overflow = menuOpen || showNotif ? 'hidden' : 'auto'
    return () => { document.body.style.overflow = 'auto' }
  }, [menuOpen, showNotif])

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications])

  const handleNavClick = (id: string) => {
    if (id === 'logout') {
      if (confirm("Logout?")) {
        localStorage.clear()
        setActivePage('landing') // FIX: go back to landing, not home
      }
      return
    }
    setActivePage(id)
    setMenuOpen(false)
    setShowNotif(false)
  }

  return (
    <>
      <header className="navbar">
        <div className="navbar-container">
          <button className="hamburger" onClick={() => setMenuOpen(true)}><Menu size={20} /></button>
          <div className="navbar-logo">YOUR<span>CBT</span></div>

          <nav className="nav-links">
            {navItems.map(item => {
              const Icon = item.icon
              return (
                <button key={item.id} className={`nav-link ${activePage === item.id ? 'active' : ''}`} onClick={() => handleNavClick(item.id)}>
                  <Icon size={18} /> {item.label}
                </button>
              )
            })}
          </nav>

          <div className="navbar-right" style={{ position: 'relative' }}>
            <button className="bell-btn" onClick={() => setShowNotif(!showNotif)}>
              <Bell size={20} />
              {unreadCount > 0 && <span className="bell-dot">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>

            {showNotif && (
              <div className="notif-panel">
                <div className="notif-header">
                  <h4>Notifications {unreadCount > 0 && <span className="notif-badge">{unreadCount} new</span>}</h4>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setNotifications(p => p.map(n => ({ ...n, read: true })))} className="notif-icon-btn"><CheckCheck size={18} /></button>
                    <button onClick={() => { if(confirm("Clear all?")) setNotifications([]) }} className="notif-icon-btn danger"><Trash2 size={16} /></button>
                  </div>
                </div>
                <div className="notif-body">
                  {notifications.length === 0 ? (
                    <div className="notif-empty"><Bell size={32} /><p>No notifications</p></div>
                  ) : notifications.map(n => (
                    <div key={n.id} onClick={() => setNotifications(p => p.map(x => x.id === n.id ? {...x, read: true} : x))} className={`notif-item ${!n.read ? 'unread' : ''}`}>
                      <div className={`notif-type ${n.type}`}></div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><b>{n.title}</b><span className="notif-time">{n.time}</span></div>
                        <p className="notif-msg">{n.message}</p>
                      </div>
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
      <div className={`sidebar-overlay ${menuOpen ? 'show' : ''}`} onClick={() => setMenuOpen(false)}></div>

      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="profile-section">
            <div className="avatar"><img src={`https://ui-avatars.com/api/?name=${userName}&background=1d4be3&color=fff&bold=true`} alt="avatar" /></div>
            <div className="profile-text"><h3>{userName}</h3><span>Free Plan • {getHistoryCount()} Tests</span></div>
            <button className="edit-profile" onClick={() => handleNavClick('account')}><Edit2 size={12} /> Edit</button>
          </div>
          <button className="close-btn" onClick={() => setMenuOpen(false)}><X size={20} /></button>
        </div>
        <nav className="sidebar-links">
          {navItems.map(item => {
            const Icon = item.icon
            return <button key={item.id} className={`sidebar-link ${activePage === item.id ? 'active' : ''}`} onClick={() => handleNavClick(item.id)}><span className="sidebar-icon"><Icon size={18} /></span>{item.label}<ChevronRight size={16} className="chevron" /></button>
          })}
          <div className="sidebar-divider"></div>
          {extraItems.map(item => {
            const Icon = item.icon
            return <button key={item.id} className={`sidebar-link ${item.danger ? 'danger' : 'muted'}`} onClick={() => handleNavClick(item.id)}><span className="sidebar-icon"><Icon size={18} /></span>{item.label}</button>
          })}
        </nav>
        <div className="sidebar-footer">YOURCBT v1.0 • Made for Nigeria 🇳🇬</div>
      </aside>

      <nav className="bottom-nav">
        {navItems.map(item => {
          const Icon = item.icon
          return <button key={item.id} className={`nav-item ${activePage === item.id ? 'active' : ''}`} onClick={() => handleNavClick(item.id)}><span className="nav-icon-wrap"><Icon size={22} /></span><span className="nav-label">{item.mobileLabel}</span></button>
        })}
      </nav>
    </>
  )
}