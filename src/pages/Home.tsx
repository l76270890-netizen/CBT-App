type Props = {
  setActivePage: (page: string) => void
  setSelectedExam: (exam: string) => void
}

import { useState, useEffect, useMemo } from 'react'
import { BookOpen, Search, X, Funnel, Flame, Trophy, Target, BarChart3 } from 'lucide-react'
import './Home.css'

export default function Home({ setActivePage, setSelectedExam }: Props) {
  const [name] = useState('Lawrence')
  const [searchQuery, setSearchQuery] = useState("")

  // Real stats from localStorage
  const [stats, setStats] = useState({
    practiced: 0,
    avgScore: 0,
    bestScore: 0,
    streak: 3 // placeholder, you can make it dynamic later
  })

  const exams = [
    { id: 'JAMB', title: 'JAMB (UTME)', desc: 'Objective only', icon: <BookOpen size={22} /> },
    { id: 'POST UTME', title: 'POST UTME', desc: 'Objective only', icon: <BookOpen size={22} /> },
    { id: 'WAEC', title: 'WAEC', desc: 'Objective only', icon: <BookOpen size={22} /> },
    { id: 'NECO', title: 'NECO', desc: 'Objective only', icon: <BookOpen size={22} /> },
  ]

  useEffect(() => {
    const history = JSON.parse(localStorage.getItem('practiceHistory') || '[]')
    if (history.length > 0) {
      const scores = history.map((h: any) => h.score || 0)
      const total = scores.reduce((a: number, b: number) => a + b, 0)
      const avg = Math.round(total / scores.length)
      const best = Math.max(...scores)
      setStats({
        practiced: history.length,
        avgScore: avg,
        bestScore: best,
        streak: 3 // you can later calculate from dates
      })
    }
  }, [])

  const filteredExams = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return exams
    return exams.filter(e =>
      e.title.toLowerCase().includes(q) ||
      e.id.toLowerCase().includes(q)
    )
  }, [searchQuery, exams])

  const handleExamClick = (examId: string) => {
    setSelectedExam(examId)
    setActivePage('subjects')
  }

  return (
    <div className="home-container">
      {/* FIXED SEARCH - NOW VISIBLE AND WORKING */}
      <div className="hero-search-bar">
        <div className="search-wrapper">
          <Search className="search-icon" size={18} />
          <input
            type="text"
            className='hero-input-box'
            placeholder='Search exam...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery? (
            <button className="clear-btn" onClick={() => setSearchQuery("")}><X size={16}/></button>
          ) : (
            <Funnel size={16} className="funnel-icon" />
          )}
        </div>
      </div>

      <div className="home-header">
        <h1 className="home-title">Hello, <span>{name}</span></h1>
        <p className="home-subtitle">Ready to practice today?</p>
        <button onClick={() => setActivePage('practiceHistory')} className='hero-btn'>View history</button>
      </div>

      {/* 4 MEANINGFUL CARDS */}
      <div className="stats-grid1">
        <div className="stats-card">
          <div className="stat-icon blue"><Target size={18}/></div>
          <h2>{stats.practiced}</h2>
          <span>Exams Practiced</span>
        </div>
        <div className="stats-card">
          <div className="stat-icon green"><BarChart3 size={18}/></div>
          <h2>{stats.avgScore}%</h2>
          <span>Avg Score</span>
        </div>
        <div className="stats-card">
          <div className="stat-icon gold"><Trophy size={18}/></div>
          <h2>{stats.bestScore}%</h2>
          <span>Best Score</span>
        </div>
        <div className="stats-card">
          <div className="stat-icon red"><Flame size={18}/></div>
          <h2>{stats.streak} days</h2>
          <span>Study Streak</span>
        </div>
      </div>

      <div className="section-header">
        <h3>Featured Exams</h3>
        <p onClick={() => setActivePage('exams')}>see more ›</p>
      </div>

      <div className="exam-list">
        {filteredExams.length > 0? filteredExams.map((exam) => (
          <div key={exam.id} className="exam-card1" onClick={() => handleExamClick(exam.id)}>
            <div className="exam-icon-wrap1"><span>{exam.icon}</span></div>
            <div className="exam-info">
              <h4>{exam.title}</h4>
              <p>{exam.desc}</p>
            </div>
            <span className="chevron">›</span>
          </div>
        )) : (
          <div className="no-result">No exam found for "{searchQuery}"</div>
        )}
      </div>
    </div>
  )
}