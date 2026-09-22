import { useState } from 'react'
import { Menu, X, Check, ArrowRight, Star } from 'lucide-react'
import './LandingMobile.css'

export default function LandingMobile({ setActivePage }: { setActivePage: (p: string) => void }) {
  const [menu, setMenu] = useState(false)

  return (
    <div className="landing">
      <header className="landing-header">
        <div className="landing-logo">
          <div className="landing-logo-box">E</div>
          <span>EXAMCORE</span>
        </div>
        <button className="landing-menu-btn" onClick={() => setMenu(!menu)}>
          {menu ? <X size={18}/> : <Menu size={18}/>}
        </button>
      </header>

      {menu && (
        <div className="landing-dropdown">
          <button onClick={() => setMenu(false)}>Home</button>
          <button onClick={() => setMenu(false)}>Exams</button>
          <button onClick={() => setMenu(false)}>Pricing</button>
          <button className="landing-dropdown-cta" onClick={() => setActivePage('login')}>Login to Start</button>
        </div>
      )}

      <section className="landing-hero">
        <div className="landing-badge">
          <span className="dot"></span> #1 CBT PLATFORM IN NIGERIA
        </div>

        <div className="landing-h1">
          <h2>Prepare Smarter, <span className="accent">Practice</span> Better</h2>
        </div>

        <p className="landing-p">
          Experience real JAMB, WAEC & NECO exams with our AI-powered platform. Get instant results & detailed analysis.
        </p>
        
        <button className="landing-primary" onClick={() => setActivePage('login')}>
          Take a free practice test <ArrowRight size={18} />
        </button>

        <div className="landing-card">
          <img src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600" alt="students" />
          <div className="landing-card-stats">
            <div className="stat">
              <div className="stat-icon green"><Check size={14} /></div>
              <div><b>Live Results</b><span>Instant scoring</span></div>
            </div>
            <div className="stat">
              <div className="stat-icon purple"><Star size={14} /></div>
              <div><b>200k+ Questions</b><span>JAMB • WAEC • NECO</span></div>
            </div>
          </div>
        </div>

        <div className="landing-trusted">
          <span>TRUSTED BY 50K+ STUDENTS</span>
          <div className="trusted-pills">
            <span>JAMB</span><span>WAEC</span><span>NECO</span>
          </div>
        </div>
      </section>
    </div>
  )
}