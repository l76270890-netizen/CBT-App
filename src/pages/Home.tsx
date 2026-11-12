import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { ArrowRight, BookOpen, CalendarDays, Search, X, Funnel, Flame, Trophy, Target, BarChart3, ChevronLeft, ChevronRight, ChevronRight as ChevronRightIcon, Clock3, Play, Zap } from 'lucide-react'
import { examTypes } from '../data/examTypes'
import './Home.css'
import { apiRequest, asArray } from '../api'

type ExamData = {
  id: string
  title: string
  examType: string
  subject?: string
  subjects?: string[]
  year: number
  duration: number
  totalQuestions?: number
  examDate?: string
}

function mapExamRecords(payload: unknown): ExamData[] {
  const data = Array.isArray(payload) ? payload : asArray<any>((payload as any)?.exams)
  return data.filter((exam: unknown) => exam && typeof exam === 'object').map((exam: any) => {
    const examDate = exam.scheduledAt ?? exam.scheduled_at ?? exam.examDate ?? exam.exam_date ?? exam.scheduledDate ?? exam.scheduled_date
    return {
      id: String(exam.id ?? ''),
      title: String(exam.title ?? 'Untitled exam'),
      examType: String(exam.examType ?? ''),
      subjects: Array.isArray(exam.subjects)
        ? exam.subjects.filter((subject: unknown): subject is string => typeof subject === 'string')
        : typeof exam.subject === 'string'
          ? exam.subject.split(',').map((subject: string) => subject.trim()).filter(Boolean)
          : [],
      year: Number(exam.year) || 0,
      duration: Number(exam.duration) || 0,
      totalQuestions: typeof exam.totalQuestions === 'number' ? exam.totalQuestions : undefined,
      examDate: typeof examDate === 'string' && examDate.trim() ? examDate : undefined,
    }
  })
}

const heroSlides = [
  { src: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200', alt: 'Students studying together' },
  { src: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200', alt: 'Student writing study notes' },
  { src: 'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=1200', alt: 'Students learning in a classroom' },
]

export default function Home({ setActivePage, setSelectedExam, setTestConfig, searchQuery, setSearchQuery }: any) {
  const { user } = useAuth()
  const [activeHeroSlide, setActiveHeroSlide] = useState(0)
  const [heroPaused, setHeroPaused] = useState(false)
  const [examsFromDb, setExamsFromDb] = useState<ExamData[]>([])
  const [upcomingFromEndpoint, setUpcomingFromEndpoint] = useState<ExamData[] | null>(null)
  const [upcomingError, setUpcomingError] = useState('')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ practiced: 0, avgScore: 0, bestScore: 0, streak: 3 })

  useEffect(() => {
    if (user?.user_id) {
      apiRequest<unknown>(`/api/history/${encodeURIComponent(user.user_id)}`).then((payload) => {
          const history = asArray<any>(payload);
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
    apiRequest<unknown>("/api/exams").then(payload => {
        setExamsFromDb(mapExamRecords(payload))
      }).catch(loadError => {
        console.error(loadError instanceof Error ? loadError.message : "Could not load exams.")
        setExamsFromDb([])
      }).finally(()=> setLoading(false))
  }, [user])

  useEffect(() => {
    let active = true
    apiRequest<unknown>('/api/admin/upcoming-exams?limit=3').then(payload => {
      if (active) {
        setUpcomingFromEndpoint(mapExamRecords(payload))
        setUpcomingError('')
      }
    }).catch(loadError => {
      if (!active) return
      if ((loadError as { status?: number }).status === 403) {
        setUpcomingFromEndpoint(null)
        setUpcomingError('')
        return
      }
      setUpcomingError(loadError instanceof Error ? loadError.message : 'Could not load upcoming examinations.')
    })
    return () => { active = false }
  }, [user?.user_id])

  useEffect(() => {
    if (heroPaused) return
    const intervalId = window.setInterval(() => {
      setActiveHeroSlide(current => (current + 1) % heroSlides.length)
    }, 3200)
    return () => window.clearInterval(intervalId)
  }, [heroPaused])

  const quickPracticeExams = examsFromDb.slice(0, 3)
  const upcomingExams = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const examsById = new Map(
      [...(upcomingFromEndpoint ?? []), ...examsFromDb].map(exam => [exam.id, exam])
    )
    return [...examsById.values()].flatMap(exam => {
      if (!exam.examDate) return []
      const dateOnlyParts = /^(\d{4})-(\d{2})-(\d{2})/.exec(exam.examDate)
      const scheduledDate = dateOnlyParts
        ? new Date(Number(dateOnlyParts[1]), Number(dateOnlyParts[2]) - 1, Number(dateOnlyParts[3]))
        : new Date(exam.examDate)
      if (Number.isNaN(scheduledDate.getTime())) return []
      scheduledDate.setHours(0, 0, 0, 0)
      return scheduledDate >= today ? [{ ...exam, scheduledDate }] : []
    }).sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime())
  }, [examsFromDb, upcomingFromEndpoint])

  // Clicking one of the five exam cards opens that exam type's subjects.
  // The subject picker then hands over to the existing Configure Test page.
  // If the admin has imported this exam type on the backend, its exam ID is
  // passed along so the imported questions are used (same as the Exams page).
  const openExamType = (examKey: string) => {
    const dbExam = examsFromDb.find(
      exam => exam.examType.toLowerCase() === examKey.toLowerCase()
    )
    setSelectedExam(dbExam ? dbExam.examType : examKey)
    setTestConfig((prev: any) => ({
      ...prev,
      examType: dbExam ? dbExam.examType : examKey,
      examId: dbExam?.id || '',
      customExamId: dbExam?.id || '',
      examTitle: dbExam?.title || '',
      customTitle: dbExam?.title || '',
      subjects: dbExam?.subjects || [],
      totalQuestions: 0,
      year: dbExam ? String(dbExam.year) : '2024',
      mode: 'exam',
      showAnswers: false,
      topic: 'All Topics',
    }))
    setActivePage('subjects')
  }

  const handleExamClick = (exam: ExamData, mode: 'exam' | 'practice' = 'exam') => {
    setSelectedExam(exam.examType)
    const subjStr = (exam.subjects?.join(",") || "").toLowerCase()
    if (exam.examType.toLowerCase().includes('general') || subjStr.includes('general')) {
      setTestConfig((prev: any) => ({...prev, examType: exam.examType, subjects: exam.subjects || [], totalQuestions: exam.totalQuestions || 20, year: String(exam.year), duration: exam.duration, customExamId: exam.id, examId: exam.id, examTitle: exam.title, mode, showAnswers: mode === 'practice' }))
      setActivePage('generalKnowledge')
      return
    }
    setTestConfig((prev: any) => ({...prev, examType: exam.examType, year: String(exam.year), duration: exam.duration, customExamId: exam.id, examId: exam.id, examTitle: exam.title, subjects: exam.subjects || [], totalQuestions: exam.totalQuestions, mode, showAnswers: mode === 'practice' }))
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
       <section className="home-header" aria-label="Featured study images" onMouseEnter={() => setHeroPaused(true)} onMouseLeave={() => setHeroPaused(false)}>
          <div className="hero-slides" aria-live="off">
            {heroSlides.map((slide, index) => (
              <img
                key={slide.src}
                className={`hero-slide ${index === activeHeroSlide ? 'is-active' : ''}`}
                src={slide.src}
                alt={slide.alt}
                aria-hidden={index !== activeHeroSlide}
                loading={index === 0 ? 'eager' : 'lazy'}
                decoding="async"
              />
            ))}
          </div>
          <div className="header-overlay"></div>
          <div className="header-content-exam">
           <h1 className="home-title">Hello, <span>{user?.username || 'User'}</span></h1>
            <p className="home-subtitle">Pick an exam and practice</p>
             <button onClick={() => setActivePage('practiceHistory')} className='hero-btn'>View history</button>
          </div>
          <div className="hero-slide-controls">
            <button type="button" aria-label="Previous image" onClick={() => setActiveHeroSlide(current => (current - 1 + heroSlides.length) % heroSlides.length)}><ChevronLeft size={18} /></button>
            <button type="button" aria-label="Next image" onClick={() => setActiveHeroSlide(current => (current + 1) % heroSlides.length)}><ChevronRight size={18} /></button>
          </div>
          <div className="hero-slide-dots" role="group" aria-label="Choose hero image">
            {heroSlides.map((slide, index) => (
              <button
                key={slide.src}
                type="button"
                className={index === activeHeroSlide ? 'active' : ''}
                aria-label={`Show image ${index + 1}`}
                aria-pressed={index === activeHeroSlide}
                onClick={() => setActiveHeroSlide(index)}
              />
            ))}
          </div>
        </section>
      <div className="stats-grid1">
        <div className="stats-card"><div className="stat-icon blue"><Target size={18} /></div><h2>{stats.practiced}</h2><span>Exams Practiced</span></div>
        <div className="stats-card"><div className="stat-icon green"><BarChart3 size={18} /></div><h2>{stats.avgScore}%</h2><span>Avg Score</span></div>
        <div className="stats-card"><div className="stat-icon gold"><Trophy size={18} /></div><h2>{stats.bestScore}%</h2><span>Best Score</span></div>
        <div className="stats-card"><div className="stat-icon red"><Flame size={18} /></div><h2>{stats.streak} days</h2><span>Study Streak</span></div>
      </div>
      <div className="section-header"><h3>Choose your examination</h3><p onClick={() => setActivePage('exams')}>see more ›</p></div>
      <div className="exam-type-grid">
        {examTypes.map(exam => (
          <div
            key={exam.key}
            className="exam-card1 exam-type-card"
            role="button"
            tabIndex={0}
            onClick={() => openExamType(exam.key)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openExamType(exam.key) } }}
            style={{ '--exam-accent': exam.accent, '--exam-accent-soft': exam.accentSoft } as React.CSSProperties}
          >
            <div className="exam-icon-wrap1"><BookOpen size={22} /></div>
            <div className="exam-info">
              <h4>{exam.label}</h4>
              <p>{exam.fullName}</p>
              <p className="exam-meta">{exam.subjects.length} subjects available</p>
            </div>
            <span className="exam-type-chevron"><ChevronRightIcon size={20} className="chevron" /></span>
          </div>
        ))}
      </div>
      <div className="home-extra-sections">
        <section className="home-extra-section" aria-labelledby="quick-practice-title">
          <div className="home-extra-heading">
            <div className="home-extra-title">
              <span className="home-extra-icon practice"><Zap size={18} /></span>
              <div>
                <h3 id="quick-practice-title">Quick practice</h3>
                <p>Jump into a practice session</p>
              </div>
            </div>
            <button type="button" className="home-extra-link" onClick={() => setActivePage('exams')}>All exams <ArrowRight size={15} /></button>
          </div>
          {loading ? <div className="home-extra-empty">Loading practice options...</div> : quickPracticeExams.length > 0 ? (
            <div className="quick-practice-list">
              {quickPracticeExams.map(exam => (
                <button key={exam.id} type="button" className="quick-practice-card" onClick={() => handleExamClick(exam, 'practice')}>
                  <span className="quick-practice-card-icon"><Play size={16} fill="currentColor" /></span>
                  <span className="quick-practice-card-copy">
                    <strong>{exam.title}</strong>
                    <span>{exam.examType} · {exam.totalQuestions ?? '—'} questions</span>
                  </span>
                  <ArrowRight className="quick-practice-arrow" size={17} />
                </button>
              ))}
            </div>
          ) : <div className="home-extra-empty">Practice options will appear here when exams are available.</div>}
        </section>

        <section className="home-extra-section" aria-labelledby="upcoming-exams-title">
          <div className="home-extra-heading">
            <div className="home-extra-title">
              <span className="home-extra-icon upcoming"><CalendarDays size={18} /></span>
              <div>
                <h3 id="upcoming-exams-title">Upcoming examinations</h3>
                <p>Keep track of your next exam</p>
              </div>
            </div>
            <Clock3 className="home-extra-heading-clock" size={17} aria-hidden="true" />
          </div>
          {upcomingExams.length > 0 ? (
            <div className="upcoming-exam-list">
              {upcomingExams.slice(0, 3).map(exam => (
                <button key={exam.id} type="button" className="upcoming-exam-card" onClick={() => handleExamClick(exam)}>
                  <span className="upcoming-exam-date">
                    <strong>{new Intl.DateTimeFormat(undefined, { day: '2-digit' }).format(exam.scheduledDate)}</strong>
                    <span>{new Intl.DateTimeFormat(undefined, { month: 'short' }).format(exam.scheduledDate)}</span>
                  </span>
                  <span className="upcoming-exam-copy">
                    <strong>{exam.title}</strong>
                    <span>{exam.examType} · {new Intl.DateTimeFormat(undefined, { weekday: 'short', year: 'numeric' }).format(exam.scheduledDate)}</span>
                  </span>
                  <ArrowRight className="quick-practice-arrow" size={17} />
                </button>
              ))}
            </div>
          ) : <div className="home-extra-empty" role={upcomingError ? 'alert' : undefined}>{upcomingError || 'No upcoming examinations have been scheduled yet.'}</div>}
        </section>
      </div>
    </div>
  )
}
