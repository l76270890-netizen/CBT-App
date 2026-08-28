type Props = {
  activePage: string
  setActivePage: (page: string) => void
}

import { useState } from 'react'
import './Navbar.css'

export default function Navbar({ activePage, setActivePage }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  
 const navItems = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'exams', label: 'Exams', icon: '📝' },
  { id: 'classroom', label: 'Study', icon: '📚' }, // <-- Changed label + icon
  { id: 'account', label: 'Account', icon: '👤' },
]

  const handleNavClick = (id: string) => {
    setActivePage(id)
    setMenuOpen(false) // close sidebar after click
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
        <div className="sidebar-header">
         
          <button className="close-btn" onClick={() => setMenuOpen(false)}>×</button>
        </div>
        
        <nav className="sidebar-links">
          {navItems.map((item) => (
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