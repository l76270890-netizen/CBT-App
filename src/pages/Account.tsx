type Props = {
  setActivePage: (page: string) => void
}

import { useState } from 'react'
import './Account.css'

export default function Account({ setActivePage }: Props) {
  const [name] = useState('Lawrence Okoro')
  const [email] = useState('lawrence@email.com')
  const [subscription] = useState('Free Plan')

  const stats = [
    { label: 'Tests Taken', value: 0, icon: '📝' },
    { label: 'Questions Solved', value: 0, icon: '✅' },
    { label: 'Best Score', value: '0%', icon: '🏆' },
  ]

  const menuItems = [
    { id: 'profile', label: 'Edit Profile', icon: '👤', desc: 'Update your details' },
    { id: 'download', label: 'Downloaded Subjects', icon: '📥', desc: 'Manage offline content' },
    { id: 'settings', label: 'Settings', icon: '⚙️', desc: 'App preferences' },
    { id: 'help', label: 'Help & Support', icon: '💬', desc: 'Get help' },
    { id: 'about', label: 'About Us', icon: 'ℹ️', desc: 'Version 1.0.0' },
  ]

  return (
    <div className="account-page">
      <div className="account-header">
        <h1>Account</h1>
      </div>

      {/* PROFILE CARD */}
      <div className="profile-card">
        <div className="profile-avatar">L</div>
        <div className="profile-info">
          <h2>{name}</h2>
          <p>{email}</p>
          <span className="subscription-badge">{subscription}</span>
        </div>
      </div>

      {/* STATS */}
      <div className="stats-grid">
        {stats.map(stat => (
          <div key={stat.label} className="stat-card">
            <div className="stat-icon">{stat.icon}</div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* MENU LIST */}
      <div className="account-menu">
        {menuItems.map(item => (
          <button
            key={item.id}
            className="menu-row"
            onClick={() => alert(`${item.label} - coming soon`)}
          >
            <div className="menu-left">
              <span className="menu-icon">{item.icon}</span>
              <div>
                <div className="menu-label">{item.label}</div>
                <div className="menu-desc">{item.desc}</div>
              </div>
            </div>
            <span className="menu-chevron">›</span>
          </button>
        ))}
      </div>

      {/* UPGRADE CTA */}
      <div className="upgrade-card">
        <div>
          <h3>Upgrade to Pro</h3>
          <p>Unlock all past questions + offline mode</p>
        </div>
        <button className="btn-upgrade" onClick={() => alert('Upgrade coming soon')}>
          UPGRADE
        </button>
      </div>

      {/* LOGOUT */}
      <button className="btn-logout" onClick={() => alert('Logout coming soon')}>
        LOGOUT
      </button>
    </div>
  )
}