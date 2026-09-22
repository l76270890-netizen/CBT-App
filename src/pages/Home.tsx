import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { BookOpen, Search, X, Funnel, Flame, Trophy, Target, BarChart3 } from 'lucide-react'
import './Home.css'
import { API_URL } from '../config'

type ExamData = {
  id: string
  title: string
  examType: string
  subject?: string
  subjects?: string[]
  year: number
  duration: number
  totalQuestions?: number
}

export default function Home({ setActivePage, setSelectedExam, setTestConfig }: any) {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [examsFromDb, setExamsFromDb] = useState<ExamData[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ practiced: 0, avgScore: 0, bestScore: 0, streak: 3 })

  useEffect(() => {
    if (user?.user_id) {
      fetch(`${API_URL}/api/history/${user.user_id}`)
       .then(r => r.json()).then((history: any[]) => {
          if (history.length > 0) {
            const percents = history.map(h => Math.round((h.score / h.total) * 100))
            setStats({
              practiced: history.length,
              avgScore: Math.round(percents.reduce((a,b)=>a+b,0)/percents.length),
              bestScore: Math.max(...percents),
              streak: 3
            })
          }
        }).catch(()=>{})
    }
    fetch(`${API_URL}/api/exams`)
     .then(r => r.json()).then(data => {
        const mapped = data.map((e:any) => ({
          id: e.id, title: e.title, examType: e.examType,
          subjects: e.subject? e.subject.split(',') : [],
          year: e.year, duration: e.duration, totalQuestions: e.totalQuestions
        }))
        setExamsFromDb(mapped)
      }).finally(()=> setLoading(false))
  }, [user])

  const filteredExams = useMemo(() => {
    const clean = searchQuery.toLowerCase().trim()
    if (!clean) return examsFromDb
    return examsFromDb.filter((exam) => {
      const allSub = exam.subjects?.join(",") || ""
      return exam.title.toLowerCase().includes(clean) || exam.examType.toLowerCase().includes(clean) || allSub.toLowerCase().includes(clean)
    })
  }, [examsFromDb, searchQuery])

  const handleExamClick = (exam: ExamData) => {
    setSelectedExam(exam.examType)
    const subjStr = (exam.subjects?.join(",") || "").toLowerCase()
    if (exam.examType.toLowerCase().includes('general') || subjStr.includes('general')) {
      setTestConfig((prev: any) => ({...prev, examType: exam.examType, subjects: exam.subjects || [], totalQuestions: exam.totalQuestions || 20, year: String(exam.year), duration: exam.duration, customExamId: exam.id }))
      setActivePage('generalKnowledge')
      return
    }
    setTestConfig((prev: any) => ({...prev, examType: exam.examType, year: String(exam.year), duration: exam.duration, customExamId: exam.id, examId: exam.id, examTitle: exam.title, subjects: exam.subjects || [], totalQuestions: exam.totalQuestions }))
    setActivePage('subjects')
  }

  return (
    <div className="home-container">
      <div className="hero-search-bar">
        <div className="search-wrapper">
          <Search className="search-icon" size={18} />
          <input type="text" className='hero-input-box' placeholder='Search JAMB, WAEC, NECO...' value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          {searchQuery? (<button className="clear-btn" onClick={() => setSearchQuery("")}><X size={16} /></button>) : (<Funnel size={16} className="funnel-icon" />)}
        </div>
      </div>
       <div className="home-header">
          <div className="slider-track">
            <img src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800" alt="" />
            <img src="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800" alt="" />
            <img src="https://images.unsplash.com/photo-1513258496099-48168024aec0?w=800" alt="" />
            <img src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800" alt="" />
          </div>
          <div className="header-overlay"></div>
          <div className="header-content-exam">
           <h1 className="home-title">Hello, <span>{user?.username || 'User'}</span></h1>
            <p className="home-subtitle">Pick exam and practice - Flask DB</p>
             <button onClick={() => setActivePage('practiceHistory')} className='hero-btn'>View history</button>
          </div>
        </div>
      <div className="stats-grid1">
        <div className="stats-card"><div className="stat-icon blue"><Target size={18} /></div><h2>{stats.practiced}</h2><span>Exams Practiced</span></div>
        <div className="stats-card"><div className="stat-icon green"><BarChart3 size={18} /></div><h2>{stats.avgScore}%</h2><span>Avg Score</span></div>
        <div className="stats-card"><div className="stat-icon gold"><Trophy size={18} /></div><h2>{stats.bestScore}%</h2><span>Best Score</span></div>
        <div className="stats-card"><div className="stat-icon red"><Flame size={18} /></div><h2>{stats.streak} days</h2><span>Study Streak</span></div>
      </div>
      <div className="section-header"><h3>Featured Exams {examsFromDb.length>0 && `(${examsFromDb.length})`}</h3><p onClick={() => setActivePage('exams')}>see more ›</p></div>
      {loading? <div className="no-result">Loading exams from Flask...</div> :
        filteredExams.length>0? (
          <div className="exam-list">
            {filteredExams.map((exam) => (
              <div key={exam.id} className="exam-card1" onClick={() => handleExamClick(exam)} style={{cursor:'pointer'}}>
                <div className="exam-icon-wrap1"><span><BookOpen size={22} /></span></div>
                <div className="exam-info"><h4>{exam.title}</h4><p>{exam.examType} • {exam.subjects?.join(', ')} • {exam.year}</p><p style={{fontSize:11,color:'#888',marginTop:4}}>{exam.totalQuestions||0} Qs • {exam.duration}min</p></div><span className="chevron">›</span>
              </div>
            ))}
          </div>
        ) : <div className="no-result">{examsFromDb.length===0? "No exams yet - Add in Admin." : `No exam for "${searchQuery}"`}</div>
      }
    </div>
  )
}