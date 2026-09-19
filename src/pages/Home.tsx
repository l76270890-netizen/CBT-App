type Props = {
  setActivePage: (page: string) => void
  setSelectedExam: (exam: string) => void
  setTestConfig: (config: any) => void
}

import { useState, useEffect, useMemo } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, getDocs, query, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { BookOpen, Search, X, Funnel, Flame, Trophy, Target, BarChart3 } from 'lucide-react'
import './Home.css'

type ExamDoc = {
  id: string
  title: string
  examType: string
  subject: string
  year: number
  duration: number
  totalQuestions?: number
}

type HistoryItem = {
  score: number
  total: number
}

export default function Home({ setActivePage, setSelectedExam, setTestConfig }: Props) {
  const [name, setName] = useState('User')
  const [searchQuery, setSearchQuery] = useState("")
  const [examsFromDb, setExamsFromDb] = useState<ExamDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ practiced: 0, avgScore: 0, bestScore: 0, streak: 3 })

  useEffect(() => {
    // 1. GET REAL USER NAME
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const snap = await getDoc(doc(db, 'users', user.uid))
          setName(user.displayName || snap.data()?.name || 'User')
        } catch {
          setName(user.displayName || 'User')
        }

        // 2. LISTEN TO FIREBASE HISTORY - THIS IS THE FIX
        const qHist = query(collection(db, `users/${user.uid}/history`), orderBy('createdAt', 'desc'))
        const unsubHist = onSnapshot(qHist, (snap) => {
          const history = snap.docs.map(d => d.data() as HistoryItem)
          if (history.length > 0) {
            const percents = history.map(h => Math.round((h.score / h.total) * 100))
            const totalPercent = percents.reduce((a, b) => a + b, 0)
            setStats({
              practiced: history.length,
              avgScore: Math.round(totalPercent / percents.length),
              bestScore: Math.max(...percents),
              streak: 3 // you can calculate streak later
            })
          } else {
            setStats({ practiced: 0, avgScore: 0, bestScore: 0, streak: 0 })
          }
        })
        return () => unsubHist()
      }
    })

    const fetchExams = async () => {
      try {
        const q = query(collection(db, "exams"), orderBy("createdAt", "desc"))
        const snap = await getDocs(q)
        setExamsFromDb(snap.docs.map(d => ({ id: d.id, ...d.data() } as ExamDoc)))
      } finally { setLoading(false) }
    }
    fetchExams()

    return () => unsubAuth()
  }, [])

  const filteredExams = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return examsFromDb
    return examsFromDb.filter(e =>
      e.title.toLowerCase().includes(q) ||
      e.examType.toLowerCase().includes(q) ||
      e.subject.toLowerCase().includes(q)
    )
  }, [searchQuery, examsFromDb])

  const handleExamClick = (exam: ExamDoc) => {
    setSelectedExam(exam.examType)

    if (exam.examType.toLowerCase().includes('general') || exam.subject.toLowerCase().includes('general')) {
      setTestConfig((prev: any) => ({
       ...prev,
        examType: exam.examType,
        subjects: [exam.subject],
        totalQuestions: exam.totalQuestions || 20,
        year: String(exam.year),
        duration: exam.duration,
        customExamId: exam.id
      }))
      setActivePage('generalKnowledge')
      return
    }

    setTestConfig((prev: any) => ({
     ...prev,
      examType: exam.examType,
      year: String(exam.year),
      duration: exam.duration,
      customExamId: exam.id,
      customTitle: exam.title
    }))
    setActivePage('subjects')
  }

  return (
    <div className="home-container">
      <div className="hero-search-bar">
        <div className="search-wrapper">
          <Search className="search-icon" size={18} />
          <input type="text" className='hero-input-box' placeholder='Search exam...' value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          {searchQuery? (<button className="clear-btn" onClick={() => setSearchQuery("")}><X size={16} /></button>) : (<Funnel size={16} className="funnel-icon" />)}
        </div>
      </div>

      <div className="home-header">
        <h1 className="home-title">Hello, <span>{name}</span></h1>
        <p className="home-subtitle">Ready to practice today?</p>
        <button onClick={() => setActivePage('practiceHistory')} className='hero-btn'>View history</button>
      </div>

      <div className="stats-grid1">
        <div className="stats-card"><div className="stat-icon blue"><Target size={18} /></div><h2>{stats.practiced}</h2><span>Exams Practiced</span></div>
        <div className="stats-card"><div className="stat-icon green"><BarChart3 size={18} /></div><h2>{stats.avgScore}%</h2><span>Avg Score</span></div>
        <div className="stats-card"><div className="stat-icon gold"><Trophy size={18} /></div><h2>{stats.bestScore}%</h2><span>Best Score</span></div>
        <div className="stats-card"><div className="stat-icon red"><Flame size={18} /></div><h2>{stats.streak} days</h2><span>Study Streak</span></div>
      </div>

      <div className="section-header">
        <h3>Featured Exams {examsFromDb.length > 0 && `(${examsFromDb.length})`}</h3>
        <p onClick={() => setActivePage('exams')}>see more ›</p>
      </div>

      {loading? <div className="no-result">Loading exams...</div> :
        filteredExams.length > 0? (
          <div className="exam-list">
            {filteredExams.map((exam) => (
              <div key={exam.id} className="exam-card1" onClick={() => handleExamClick(exam)} style={{cursor:'pointer'}}>
                <div className="exam-icon-wrap1"><span><BookOpen size={22} /></span></div>
                <div className="exam-info">
                  <h4>{exam.title}</h4>
                  <p>{exam.examType} • {exam.subject} • {exam.year} • {exam.duration}min</p>
                </div>
                <span className="chevron">›</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-result">{examsFromDb.length===0? "No exams uploaded yet." : `No exam found for "${searchQuery}"`}</div>
        )
      }
    </div>
  )
}