type Props = {
  activePage: string
  setActivePage: (page: string) => void
  userName?: string // add this if you have it
}

import { useState } from 'react'
import './Navbar.css'

export default function Navbar({ activePage, setActivePage, userName = "Lawrence" }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  
  // Sidebar menu - matches your screenshot
 const sidebarItems = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'exams', label: 'Exams', icon: '📝' },
  { id: 'classroom', label: 'Study', icon: '📚' }, // <-- Changed label + icon
   { id: 'history', label: 'Practice History', icon: '⏱' },
   { id: 'analytics', label: 'Performance Analysis', icon: '📊' },
     { id: 'account', label: 'Account', icon: '👤' },
    { id: 'logout', label: 'Log out', icon: '⏻' },
  
]


  // Bottom nav - keep it simple for mobile
  const navItems = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'exams', label: 'Exams', icon: '📝' },
    { id: 'classroom', label: 'Study', icon: '📚' },
    { id: 'account', label: 'Account', icon: '👤' },
  ]

  const handleNavClick = (id: string) => {
    setActivePage(id)
    setMenuOpen(false)
  }

  return (
    <>
      {/* TOP BAR - MOBILE + DESKTOP */}
      <header className="navbar">
        <div className="navbar-container">
          {/* HAMBURGER - MOBILE ONLY */}
          <button 
            className="hamburger" 
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            <span className={`bar ${menuOpen ? 'open' : ''}`}></span>
            <span className={`bar ${menuOpen ? 'open' : ''}`}></span>
            <span className={`bar ${menuOpen ? 'open' : ''}`}></span>
          </button>
          
          {/* DESKTOP NAV */}
          <nav className="nav-links">
            {navItems.map((item) => (
              <button
                key={item.id}
                className={`nav-link ${activePage === item.id ? 'active' : ''}`}
                onClick={() => handleNavClick(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* SIDEBAR OVERLAY - MOBILE */}
      <div className={`sidebar-overlay ${menuOpen ? 'show' : ''}`} onClick={() => setMenuOpen(false)}></div>
      
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        {/* PROFILE HEADER - from screenshot */}
        <div className="sidebar-header">
          <button className="close-btn" onClick={() => setMenuOpen(false)}>×</button>
          <div className="profile-section">
            <div className="avatar">
              <img src={`https://ui-avatars.com/api/?name=${userName}&background=10B981&color=fff&size=128`} alt="avatar" />
            </div>
            <h3>{userName}</h3>
            <button className="edit-profile" onClick={() => handleNavClick('profile')}>Edit Profile</button>
          </div>
        </div>
        
        {/* SIDEBAR MENU - from screenshot */}
        <nav className="sidebar-links">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              className={`sidebar-link ${activePage === item.id ? 'active' : ''}`}
              onClick={() => handleNavClick(item.id)}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* MOBILE BOTTOM NAV */}
      <nav className="bottom-nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activePage === item.id ? 'active' : ''}`}
            onClick={() => handleNavClick(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </>
  )
}