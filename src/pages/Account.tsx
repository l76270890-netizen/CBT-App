type Props = {
  setActivePage: (page: string) => void
}

import { useState, useEffect } from 'react'
import { User, Download, Settings, HelpCircle, Info, ChevronRight, Crown, LogOut, Edit3 } from 'lucide-react'
import './Account.css'

export default function Account({ setActivePage }: Props) {
  const [name, setName] = useState('Lawrence Okoro')
  const [email] = useState('lawrence@email.com')
  const [subscription] = useState('Free Plan')
  const [practiced, setPracticed] = useState(0)

  useEffect(() => {
    const history = JSON.parse(localStorage.getItem('practiceHistory') || '[]')
    setPracticed(history.length)
    const savedName = localStorage.getItem('yourcbt_username')
    if(savedName) setName(savedName)
  }, [])

  const menuItems = [
    { id: 'profile', label: 'Edit Profile', icon: User, desc: 'Update your details', action: () => { const n = prompt("Enter new name", name); if(n){ setName(n); localStorage.setItem('yourcbt_username', n) } } },
    { id: 'download', label: 'Downloaded Subjects', icon: Download, desc: `${practiced} offline tests saved`, action: () => setActivePage('practiceHistory') },
    { id: 'settings', label: 'Settings', icon: Settings, desc: 'Theme, notifications', action: () => alert('Settings coming soon') },
    { id: 'help', label: 'Help & Support', icon: HelpCircle, desc: 'Chat with us on WhatsApp', action: () => window.open('https://wa.me/2340000000000', '_blank') },
    { id: 'about', label: 'About Us', icon: Info, desc: 'Version 1.0.0 • YOURCBT', action: () => alert('YOURCBT v1 - Built for Nigerian students 🇳🇬') },
  ]

  return (
    <div className="account-page">
      <div className="account-header">
        <h1>Account</h1>
        <button className="edit-btn" onClick={()=>{ const n=prompt("New name", name); if(n){ setName(n); localStorage.setItem('yourcbt_username', n) } }}>
          <Edit3 size={16}/> Edit
        </button>
      </div>

      <div className="profile-card">
        <div className="profile-avatar">{name.charAt(0).toUpperCase()}</div>
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
              <div className="menu-left">
                <div className="menu-icon-wrap"><Icon size={18}/></div>
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

      <div className="upgrade-card">
        <div className="upgrade-left">
          <div className="crown-icon"><Crown size={20}/></div>
          <div>
            <h3>Upgrade to Pro</h3>
            <p>Unlock all questions + offline + no ads</p>
          </div>
        </div>
        <button className="btn-upgrade" onClick={() => alert('Pro coming soon - ₦2000/year')}>UPGRADE</button>
      </div>

      <button className="btn-logout" onClick={() => { if(confirm("Logout? This will clear history")) { localStorage.clear(); setActivePage('exams') } }}>
        <LogOut size={16}/> Logout
      </button>

      <p className="footer-text">Made with ❤️ for Nigerian Students</p>
    </div>
  )
}