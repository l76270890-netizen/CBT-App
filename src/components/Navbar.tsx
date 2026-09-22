import { useState, useEffect, useMemo } from 'react'
import { Home, FileText, BookOpen, History, User, LogOut, Settings, Bell, Menu, X, ChevronRight, Edit2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './Navbar.css'

export default function Navbar({ activePage, setActivePage }: any) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [showNotif, setShowNotif] = useState(false)
  const [notifications] = useState<any[]>([])
  const [historyCount, setHistoryCount] = useState(0)
  const { user, logout } = useAuth()

  useEffect(() => {
    if(!user?.user_id) return
    fetch(`http://localhost:5000/api/history/${user.user_id}`)
   .then(r=>r.json()).then(data=> setHistoryCount(data.length)).catch(()=>{})
  }, [user])

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

  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.username || user?.email || 'User')}&background=1d4be3&color=fff&bold=true`
  const unreadCount = useMemo(() => notifications.filter(n =>!n.read).length, [notifications])

  const handleNavClick = async (id: string) => {
    if (id === 'logout') {
      if (confirm("Logout?")) { logout(); setActivePage('landing') }
      return
    }
    setActivePage(id); setMenuOpen(false); setShowNotif(false)
  }

  return (
    <>
      <header className="navbar">
        <div className="navbar-container">
          <button className="hamburger" onClick={() => setMenuOpen(true)}><Menu size={20} /></button>
          <div className="home-logo-box">E</div><span className='span'>EXAMCORE</span>

          <nav className="nav-links">
            {navItems.map(item => { const Icon = item.icon; return <button key={item.id} className={`nav-link ${activePage === item.id? 'active' : ''}`} onClick={() => handleNavClick(item.id)}><Icon size={18} /> {item.label}</button> })}
          </nav>

          <div className="navbar-right">
            {user && (
              <div className="navbar-user">
                <img src={avatarUrl} alt="avatar" />
                <div className="navbar-user-info">
                  <span className="navbar-user-name">{user.username}</span>
                  <span className="navbar-user-email">{user.email}</span>
                </div>
              </div>
            )}
            <button className="bell-btn" onClick={() => setShowNotif(!showNotif)}><Bell size={20} />{unreadCount>0 && <span className="bell-dot">{unreadCount}</span>}</button>
          </div>
        </div>
      </header>

      <div className={`sidebar-overlay ${menuOpen? 'show' : ''}`} onClick={() => setMenuOpen(false)}></div>
      <aside className={`sidebar ${menuOpen? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="profile-section">
            <div className="avatar"><img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /></div>
            <div className="profile-text">
              <h3>{user?.username || 'User'}</h3>
              <span style={{ fontSize: 12, opacity: 0.7, wordBreak:'break-all' }}>{user?.email || 'Not logged in'}</span>
              <span>Free Plan • {historyCount} Tests</span>
            </div>
            <button className="edit-profile" onClick={() => handleNavClick('account')}><Edit2 size={12} /> Edit</button>
          </div>
          <button className="close-btn" onClick={() => setMenuOpen(false)}><X size={20} /></button>
        </div>
        <nav className="sidebar-links">
          {navItems.map(item => { const Icon = item.icon; return <button key={item.id} className={`sidebar-link ${activePage === item.id? 'active' : ''}`} onClick={() => handleNavClick(item.id)}><span className="sidebar-icon"><Icon size={18} /></span>{item.label}<ChevronRight size={16} className="chevron" /></button> })}
          <div className="sidebar-divider"></div>
          {extraItems.map(item => { const Icon = item.icon; return <button key={item.id} className={`sidebar-link ${item.danger? 'danger' : 'muted'}`} onClick={() => handleNavClick(item.id)}><span className="sidebar-icon"><Icon size={18} /></span>{item.label}</button> })}
        </nav>
        <div className="sidebar-footer">EXAMCORE v1.0 • {user?.email} • {historyCount} Tests 🇳🇬</div>
      </aside>

      <nav className="bottom-nav">
        {navItems.map(item => { const Icon = item.icon; return <button key={item.id} className={`nav-item ${activePage === item.id? 'active' : ''}`} onClick={() => handleNavClick(item.id)}><span className="nav-icon-wrap"><Icon size={22} /></span><span className="nav-label">{item.mobileLabel}</span></button> })}
      </nav>
    </>
  )
}