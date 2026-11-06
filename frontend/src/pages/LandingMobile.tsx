import { useState } from 'react'
import { Menu, X, Check, ArrowRight, Star, Clock3, BookOpen, ChartNoAxesColumnIncreasing } from 'lucide-react'
import './LandingMobile.css'

const examPaths = [
  { name: 'JAMB', detail: 'Practice for UTME with timed CBT sessions.' },
  { name: 'WAEC', detail: 'Build confidence across your exam subjects.' },
  { name: 'NECO', detail: 'Practice questions and review your results.' },
  { name: 'Post-UTME', detail: 'Prepare for your next admission test.' },
]

const studyFeatures = [
  { title: 'Practice under time', detail: 'Get comfortable with CBT pacing and timed sessions.', Icon: Clock3 },
  { title: 'See your results', detail: 'Check your score as soon as you finish a practice test.', Icon: ChartNoAxesColumnIncreasing },
  { title: 'Review and improve', detail: 'Use explanations and practice history to guide your next session.', Icon: BookOpen },
]

const plans = [
  { name: 'Daily', price: '₦100', duration: '1 day' },
  { name: 'Weekly', price: '₦300', duration: '7 days' },
  { name: 'Monthly', price: '₦5,000', duration: '1 month' },
  { name: 'Yearly', price: '₦25,000', duration: '12 months' },
]

const subjects = [
  'Mathematics', 'English', 'Physics', 'Chemistry', 'Biology',
  'Government', 'Economics', 'Literature', 'CRS', 'Geography',
]

export default function LandingMobile({ setActivePage }: { setActivePage: (p: string) => void }) {
  const [menu, setMenu] = useState(false)

  const scrollToSection = (sectionId: string) => {
    setMenu(false)
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="landing">
      <header className="landing-header">
        <div className="landing-logo">
          <img className="landing-logo-box" src="/icons/examcore-192.png" alt="ExamCore" />
          <span>EXAMCORE</span>
        </div>
        <button className="landing-menu-btn" aria-label={menu ? 'Close menu' : 'Open menu'} aria-expanded={menu} onClick={() => setMenu(!menu)}>
          {menu ? <X size={18}/> : <Menu size={18}/>}
        </button>
      </header>

      {menu && (
        <nav className="landing-dropdown" aria-label="Main navigation">
          <button onClick={() => scrollToSection('home')}>Home</button>
          <button onClick={() => scrollToSection('exam-paths')}>Exams</button>
          <button onClick={() => scrollToSection('plans')}>Pricing</button>
          <button className="landing-dropdown-cta" onClick={() => setActivePage('login')}>Login to Start</button>
        </nav>
      )}

      <section className="landing-hero" id="home">
        <div className="landing-badge">
          <span className="dot"></span> #1 CBT PLATFORM IN NIGERIA
        </div>

        <div className="landing-h1">
          <h2>Prepare Smarter, <span className="accent">Practice</span> Better</h2>
        </div>

        <p className="landing-p">
          Experience real JAMB, WAEC & NECO exams with our AI-powered platform. Get instant results & detailed analysis.
        </p>

        <button className="landing-primary" onClick={() => setActivePage('demo')}>
          Take a free practice test <ArrowRight size={18} />
        </button>
        <button className="landing-secondary" onClick={() => setActivePage('register')}>
          Create your account
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

      <section className="landing-section" id="exam-paths">
        <div className="landing-section-inner">
          <div className="landing-section-heading">
            <p className="landing-eyebrow">YOUR NEXT EXAM</p>
            <h2>Prepare for the exam ahead</h2>
            <p>Choose an exam path and start practicing at your own pace.</p>
          </div>
          <div className="landing-exam-grid">
            {examPaths.map(exam => (
              <button className="landing-exam-item" key={exam.name} onClick={() => setActivePage('demo')}>
                <span className="landing-exam-name">{exam.name}</span>
                <span className="landing-exam-detail">{exam.detail}</span>
                <span className="landing-text-link">Explore practice <ArrowRight size={15} /></span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-section-muted" id="practice">
        <div className="landing-section-inner">
          <div className="landing-section-heading">
            <p className="landing-eyebrow">HOW YOU PREPARE</p>
            <h2>Practice, review, improve</h2>
            <p>Build a steady study routine with tools made for computer-based tests.</p>
          </div>
          <div className="landing-feature-grid">
            {studyFeatures.map(({ title, detail, Icon }) => (
              <article className="landing-feature" key={title}>
                <span className="landing-feature-icon"><Icon size={20} /></span>
                <h3>{title}</h3>
                <p>{detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section" id="plans">
        <div className="landing-section-inner">
          <div className="landing-section-heading">
            <p className="landing-eyebrow">SIMPLE ACCESS</p>
            <h2>Choose your study plan</h2>
            <p>Pick the access period that works for you. You can choose a plan when you register.</p>
          </div>
          <div className="landing-plan-grid">
            {plans.map(plan => (
              <article className="landing-plan" key={plan.name}>
                <h3>{plan.name}</h3>
                <p className="landing-plan-price">{plan.price}</p>
                <p className="landing-plan-duration">Full CBT access for {plan.duration}</p>
                <button className="landing-plan-cta" onClick={() => setActivePage('register')}>
                  Get started <ArrowRight size={15} />
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-section-muted" id="subjects">
        <div className="landing-section-inner landing-subject-layout">
          <div className="landing-section-heading">
            <p className="landing-eyebrow">STUDY BY SUBJECT</p>
            <h2>Focus on what you’re learning</h2>
            <p>Subject availability depends on the exams and practice materials in the platform.</p>
          </div>
          <ul className="landing-subject-list">
            {subjects.map(subject => <li key={subject}><Check size={15} />{subject}</li>)}
          </ul>
        </div>
      </section>

      <section className="landing-final-cta">
        <div>
          <p className="landing-eyebrow">START WHEN YOU’RE READY</p>
          <h2>Make your next practice session count.</h2>
        </div>
        <button className="landing-primary" onClick={() => setActivePage('demo')}>
          Try a free practice test <ArrowRight size={18} />
        </button>
      </section>

      <footer className="landing-footer">
        <div className="landing-logo">
          <img className="landing-logo-box" src="/icons/examcore-192.png" alt="" />
          <span>EXAMCORE</span>
        </div>
        <span>Practice with confidence.</span>
      </footer>
    </div>
  )
}