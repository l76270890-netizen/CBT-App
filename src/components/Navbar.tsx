type Props = {
  activePage: string
  setActivePage: (page: string) => void
  userName?: string
}

import { useState, useEffect } from 'react'
import { Home, FileText, BookOpen, History, User, LogOut, Settings, Bell, Menu, X, ChevronRight, Edit2 } from 'lucide-react'
import './Navbar.css'

export default function Navbar({ activePage, setActivePage, userName = "Lawrence" }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)

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

  // Lock body scroll when menu open
  useEffect(() => {
    if(menuOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = 'auto'
    return () => { document.body.style.overflow = 'auto' }
  }, [menuOpen])

  const handleNavClick = (id: string) => {
    if (id === 'logout') {
      if(confirm("Logout?")) { localStorage.clear(); setActivePage('home') }
      return
    }
    setActivePage(id)
    setMenuOpen(false)
  }

  return (
    <>
      <header className="navbar">
        <div className="navbar-container">
          <button className="hamburger" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>

          <div className="navbar-logo">YOUR<span>CBT</span></div>

          <nav className="nav-links">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  className={`nav-link ${activePage === item.id? 'active' : ''}`}
                  onClick={() => handleNavClick(item.id)}
                >
                  <Icon size={18} /> {item.label}
                </button>
              )
            })}
          </nav>

          <div className="navbar-right">
            <button className="bell-btn" aria-label="Notifications">
              <Bell size={20} />
              <span className="bell-dot"></span>
            </button>
          </div>
        </div>
      </header>

      <div className={`sidebar-overlay ${menuOpen? 'show' : ''}`} onClick={() => setMenuOpen(false)}></div>

      <aside className={`sidebar ${menuOpen? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="profile-section">
            <div className="avatar">
              <img src={`https://ui-avatars.com/api/?name=${userName}&background=1d4be3&color=fff&bold=true`} alt="avatar" />
            </div>
            <div className="profile-text">
              <h3>{userName}</h3>
              <span>Free Plan • {JSON.parse(localStorage.getItem('practiceHistory')||'[]').length} Tests</span>
            </div>
            <button className="edit-profile" onClick={() => handleNavClick('account')}>
              <Edit2 size={12} /> Edit
            </button>
          </div>
          <button className="close-btn" onClick={() => setMenuOpen(false)}><X size={20} /></button>
        </div>

        <nav className="sidebar-links">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                className={`sidebar-link ${activePage === item.id? 'active' : ''}`}
                onClick={() => handleNavClick(item.id)}
              >
                <span className="sidebar-icon"><Icon size={18} /></span>
                {item.label}
                <ChevronRight size={16} className="chevron" />
              </button>
            )
          })}

          <div className="sidebar-divider"></div>

          {extraItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                className={`sidebar-link ${item.danger? 'danger' : 'muted'}`}
                onClick={() => handleNavClick(item.id)}
              >
                <span className="sidebar-icon"><Icon size={18} /></span>
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="sidebar-footer">YOURCBT v1.0 • Made for Nigeria 🇳🇬</div>
      </aside>

      <nav className="bottom-nav">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activePage === item.id
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive? 'active' : ''}`}
              onClick={() => handleNavClick(item.id)}
            >
              <span className="nav-icon-wrap"><Icon size={22} /></span>
              <span className="nav-label">{item.mobileLabel}</span>
            </button>
          )
        })}
      </nav>
    </>
  )
}