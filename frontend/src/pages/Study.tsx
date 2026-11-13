type Props = {
  setActivePage: (page: string) => void
  selectedExam: string
  setTestConfig: (config: any) => void
}

import { useState, useMemo, useEffect } from 'react'
import { BookOpen, Calculator, Atom, Beaker, Zap, Landmark, Search, X, ChevronRight, ArrowLeft, Feather, Scale, ShoppingBag, Leaf, BarChart3, Layers, CalendarDays } from 'lucide-react'
import { apiRequest, asArray } from '../api'
import './Study.css'

type SubjectMeta = { id: string; name: string; icon: any; color: string; dept: 'ALL' | 'SCIENCE' | 'ART' | 'COMMERCIAL' }
type StudyStep = 'subjects' | 'modes' | 'topics' | 'years'

export default function Study({ setActivePage, selectedExam, setTestConfig }: Props) {
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const [step, setStep] = useState<StudyStep>('subjects')
  const [searchQuery, setSearchQuery] = useState("")
  const [activeDept, setActiveDept] = useState<'ALL' | 'SCIENCE' | 'ART' | 'COMMERCIAL'>('ALL')
  const [catalog, setCatalog] = useState<{ topicsBySubject: Record<string,string[]>; availability: any }>({ topicsBySubject: {}, availability: {} })
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState("")
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const examType = (selectedExam || 'JAMB').toString()

  useEffect(() => {
    let cancelled = false
    setCatalogLoading(true)
    ;(async () => {
      try {
        const data = await apiRequest<any>(`/api/study/meta?examType=${encodeURIComponent(examType)}`)
        if (cancelled) return
        setCatalog({
          topicsBySubject: data?.topicsBySubject && typeof data.topicsBySubject === 'object' ? data.topicsBySubject : {},
          availability: data?.availability && typeof data.availability === 'object' ? data.availability : {},
        })
        setCatalogError("")
      } catch (e) {
        if (!cancelled) setCatalogError(e instanceof Error ? e.message : "Could not load study catalog.")
      } finally {
        if (!cancelled) setCatalogLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [examType])

  const subjects: SubjectMeta[] = [
    { id: 'english', name: 'English Language', icon: BookOpen, color: '#3B82F6', dept: 'ALL' },
    { id: 'math', name: 'Mathematics', icon: Calculator, color: '#10B981', dept: 'SCIENCE' },
    { id: 'biology', name: 'Biology', icon: Atom, color: '#8B5CF6', dept: 'SCIENCE' },
    { id: 'chemistry', name: 'Chemistry', icon: Beaker, color: '#F59E0B', dept: 'SCIENCE' },
    { id: 'physics', name: 'Physics', icon: Zap, color: '#EF4444', dept: 'SCIENCE' },
    { id: 'agric', name: 'Agricultural Science', icon: Leaf, color: '#16A34A', dept: 'SCIENCE' },
    { id: 'govt', name: 'Government', icon: Landmark, color: '#6366F1', dept: 'ART' },
    { id: 'literature', name: 'Literature in English', icon: Feather, color: '#EC4899', dept: 'ART' },
    { id: 'crk', name: 'Christian Religious Studies', icon: BookOpen, color: '#7C3AED', dept: 'ART' },
    { id: 'history', name: 'History', icon: Landmark, color: '#92400E', dept: 'ART' },
    { id: 'economics', name: 'Economics', icon: BarChart3, color: '#059669', dept: 'COMMERCIAL' },
    { id: 'commerce', name: 'Commerce', icon: ShoppingBag, color: '#0891B2', dept: 'COMMERCIAL' },
    { id: 'accounting', name: 'Financial Accounting', icon: Calculator, color: '#0F766E', dept: 'COMMERCIAL' },
    { id: 'business', name: 'Business Studies', icon: Scale, color: '#4338CA', dept: 'COMMERCIAL' },
    { id: 'geography', name: 'Geography', icon: Landmark, color: '#2563EB', dept: 'ART' },
    { id: 'gk', name: 'General Knowledge', icon: BookOpen, color: '#0EA5E9', dept: 'ALL' },
    { id: 'current', name: 'Current Affairs', icon: BookOpen, color: '#F97316', dept: 'ALL' },
    { id: 'computer', name: 'Computer Studies', icon: BookOpen, color: '#14B8A6', dept: 'SCIENCE' },
  ]

  const fallbackTopics: Record<string,string[]> = {
    'English Language': ['Lexis & Structure', 'Oral English', 'Comprehension', 'Summary'],
    'Mathematics': ['Algebra', 'Trigonometry', 'Probability', 'Calculus', 'Geometry', 'Statistics'],
    'Biology': ['Cell Biology', 'Genetics', 'Ecology', 'Human Anatomy'],
    'Chemistry': ['Atomic Structure', 'Organic Chemistry', 'Acids & Bases', 'Mole Concept'],
    'Physics': ['Mechanics', 'Electricity', 'Waves', 'Modern Physics'],
    'Agricultural Science': ['Crop Production', 'Animal Husbandry', 'Soil Science', 'Farm Management'],
    'Government': ['Constitution', 'Political Parties', 'Elections', 'International Relations'],
    'Literature in English': ['African Prose', 'Non-African Prose', 'Poetry', 'Drama'],
    'Christian Religious Studies': ['Old Testament', 'New Testament', 'Themes', 'Life of Jesus'],
    'History': ['Pre-Colonial', 'Colonial Era', 'Independence', 'World History'],
    'Economics': ['Micro Economics', 'Macro Economics', 'Demand & Supply', 'Market Structure'],
    'Commerce': ['Trade', 'Business Organization', 'Finance', 'Marketing'],
    'Financial Accounting': ['Double Entry', 'Trial Balance', 'Final Accounts', 'Partnership'],
    'Business Studies': ['Office Practice', 'Business Law', 'Management', 'Entrepreneurship'],
    'Geography': ['Physical Geography', 'Human Geography', 'Map Reading'],
    'General Knowledge': ['Current Affairs', 'Science & Technology', 'Civics'],
    'Current Affairs': ['National Affairs', 'International Affairs', 'Education'],
    'Computer Studies': ['Computer Fundamentals', 'Programming Basics', 'Networking'],
  }

  const topicsFor = (subjectName: string) => {
    const fromMeta = catalog.topicsBySubject?.[subjectName]
    if (Array.isArray(fromMeta) && fromMeta.length) return fromMeta
    return fallbackTopics[subjectName] || []
  }

  const availBySubject = (subjectName: string) => (catalog.availability?.[examType] || {})[subjectName] || {}

  const availableTopicsFor = (subjectName: string) => {
    const bySubj = availBySubject(subjectName)
    const configured = topicsFor(subjectName)
    const seen = new Set<string>()
    const out: { name: string; count: number }[] = []
    for (const t of configured) {
      const years = bySubj?.[t] || {}
      let c = 0
      for (const y of Object.keys(years)) c += Number(years[y]) || 0
      if (c > 0) { out.push({ name: t, count: c }); seen.add(t) }
    }
    for (const t of Object.keys(bySubj)) {
      if (seen.has(t)) continue
      const years = bySubj?.[t] || {}
      let c = 0
      for (const y of Object.keys(years)) c += Number(years[y]) || 0
      if (c > 0) out.push({ name: t, count: c })
    }
    return out
  }

  const availableYearsFor = (subjectName: string) => {
    const bySubj = availBySubject(subjectName)
    const yearMap = new Map<string, number>()
    for (const t of Object.keys(bySubj)) {
      const years = bySubj?.[t] || {}
      for (const y of Object.keys(years)) {
        const c = Number(years[y]) || 0
        if (c > 0) yearMap.set(String(y), (yearMap.get(String(y)) || 0) + c)
      }
    }
    return Array.from(yearMap.entries())
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => Number(b.year) - Number(a.year))
  }

  const countForSubject = (subjectName: string) => {
    const bySubj = availBySubject(subjectName)
    let total = 0
    for (const t of Object.keys(bySubj)) {
      const years = bySubj?.[t] || {}
      for (const y of Object.keys(years)) total += Number(years[y]) || 0
    }
    return total
  }

  const filteredSubjects = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    let list = subjects
    if (activeDept !== 'ALL') list = list.filter(s => s.dept === activeDept || s.dept === 'ALL')
    if (!q) return list
    return list.filter(s => s.name.toLowerCase().includes(q) || s.id.includes(q))
  }, [searchQuery, activeDept])

  const launchStudy = async (subjectName: string, opts: { topic?: string; year?: string }) => {
    const key = opts.topic ? `topic:${opts.topic}` : `year:${opts.year || 'all'}`
    setActionLoading(key)
    try {
      const params = new URLSearchParams({ examType, subject: subjectName })
      if (opts.topic) params.set('topics', opts.topic)
      if (opts.year) params.set('year', opts.year)
      const rows = await apiRequest<any[]>(`/api/study/questions?${params.toString()}`)
      const questions = asArray<any>(rows).map((d: any, i: number) => ({
        id: d.id ?? `sq-${i}`,
        subject: d.subject || subjectName,
        topic: d.topic || opts.topic || '',
        year: d.year,
        question: d.question,
        imageUrl: d.imageUrl || d.image_url || undefined,
        options: Array.isArray(d.options) ? d.options : [d.options?.A, d.options?.B, d.options?.C, d.options?.D],
        answer: typeof d.answer === 'number' ? d.answer : Math.max(0, ['A','B','C','D'].indexOf(String(d.correctAnswer || d.answer || 'A').toUpperCase())),
        explanation: d.explanation || '',
      })).filter((q: any) => q.question && Array.isArray(q.options) && q.options.length === 4)
      if (!questions.length) {
        if (opts.topic) alert(`No study questions found for ${subjectName} • ${opts.topic} (${examType}).`)
        else alert(`No study questions found for ${subjectName} • ${opts.year} (${examType}).`)
        return
      }
      localStorage.setItem('current_questions', JSON.stringify(questions))
      setTestConfig({
        examType,
        subjects: [subjectName],
        totalQuestions: questions.length,
        year: opts.year || 'All',
        duration: subjectName.toLowerCase().includes('english') ? 60 : 40,
        ...(opts.topic ? { topic: opts.topic } : {}),
        mode: 'practice',
        difficulty: 'Normal',
        showAnswers: true,
        fromStudy: true,
      })
      setActivePage('test')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not load study questions.')
    } finally {
      setActionLoading(null)
    }
  }

  const openSubject = (subjectId: string) => {
    setSelectedSubject(subjectId)
    setStep('modes')
  }

  const backFromSubjectFlow = () => {
    if (step === 'topics' || step === 'years') setStep('modes')
    else { setSelectedSubject(null); setStep('subjects') }
  }

  if (selectedSubject) {
    const subject = subjects.find(s => s.id === selectedSubject) || subjects[0]
    const Icon = subject.icon
    const topicItems = availableTopicsFor(subject.name)
    const yearItems = availableYearsFor(subject.name)
    const total = countForSubject(subject.name)

    if (step === 'modes') {
      return (
        <div className="study-page">
          <div className="study-header topic-header">
            <button className="back-btn" onClick={backFromSubjectFlow}><ArrowLeft size={18} /> Back</button>
            <div className="topic-header-main">
              <div className="subject-icon large" style={{background: `${subject.color}20`, color: subject.color}}><Icon size={24} /></div>
              <div>
                <h1>{subject.name}</h1>
                <p>{examType} • {topicItems.length} Topics • {yearItems.length} Years • {total} Questions</p>
              </div>
            </div>
          </div>
          {catalogError && <p className="admin-error" role="alert" style={{marginBottom:12}}>{catalogError} <button type="button" className="study-inline-retry" onClick={() => window.location.reload()}>Retry</button></p>}
          {catalogLoading ? <div className="study-loading">Loading study options...</div> : (
            <div className="study-mode-grid">
              <button type="button" className="study-mode-card" onClick={() => setStep('topics')} disabled={topicItems.length === 0}>
                <div className="study-mode-icon" style={{background: `${subject.color}20`, color: subject.color}}><Layers size={22} /></div>
                <div className="study-mode-body">
                  <div className="study-mode-title">Study by Topic</div>
                  <div className="study-mode-desc">{topicItems.length ? `${topicItems.length} topic${topicItems.length===1?'':'s'} available for ${subject.name}.` : 'No topics with questions available yet.'}</div>
                </div>
                <ChevronRight size={18} className="topic-chevron" />
              </button>
              <button type="button" className="study-mode-card" onClick={() => setStep('years')} disabled={yearItems.length === 0}>
                <div className="study-mode-icon" style={{background: `${subject.color}20`, color: subject.color}}><CalendarDays size={22} /></div>
                <div className="study-mode-body">
                  <div className="study-mode-title">Study by Year</div>
                  <div className="study-mode-desc">{yearItems.length ? `${yearItems.length} year${yearItems.length===1?'':'s'} available for ${subject.name}.` : 'No years with questions available yet.'}</div>
                </div>
                <ChevronRight size={18} className="topic-chevron" />
              </button>
            </div>
          )}
          {!catalogLoading && topicItems.length === 0 && yearItems.length === 0 && <div className="no-result">No study questions available yet for {subject.name} ({examType}).</div>}
        </div>
      )
    }

    if (step === 'years') {
      return (
        <div className="study-page">
          <div className="study-header topic-header">
            <button className="back-btn" onClick={backFromSubjectFlow}><ArrowLeft size={18} /> Back</button>
            <div className="topic-header-main">
              <div className="subject-icon large" style={{background: `${subject.color}20`, color: subject.color}}><Icon size={24} /></div>
              <div>
                <h1>{subject.name} — Years</h1>
                <p>{examType} • Select a year to practice questions from that year</p>
              </div>
            </div>
          </div>
          {catalogError && <p className="admin-error" role="alert" style={{marginBottom:12}}>{catalogError}</p>}
          {catalogLoading ? <div className="study-loading">Loading years...</div> : yearItems.length === 0 ? (
            <div className="no-result">No years available for {subject.name} ({examType}) yet.</div>
          ) : (
            <div className="topic-list">
              {yearItems.map(item => (
                <button type="button" key={item.year} className="topic-card" onClick={() => void launchStudy(subject.name, { year: item.year })} disabled={actionLoading !== null}>
                  <div className="topic-left">
                    <div className="topic-dot" style={{background: subject.color}}></div>
                    <div>
                      <div className="topic-title">{item.year}</div>
                      <div className="topic-meta">{item.count} Question{item.count===1?'':'s'} • {examType}</div>
                    </div>
                  </div>
                  <span className="topic-chevron">{actionLoading === `year:${item.year}` ? '…' : <ChevronRight size={18} />}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )
    }

    // topics
    return (
      <div className="study-page">
        <div className="study-header topic-header">
          <button className="back-btn" onClick={backFromSubjectFlow}><ArrowLeft size={18} /> Back</button>
          <div className="topic-header-main">
            <div className="subject-icon large" style={{background: `${subject.color}20`, color: subject.color}}><Icon size={24} /></div>
            <div>
              <h1>{subject.name} — Topics</h1>
              <p>{examType} • Select a topic to practice</p>
            </div>
          </div>
        </div>
        {catalogError && <p className="admin-error" role="alert" style={{marginBottom:12}}>{catalogError}</p>}
        {catalogLoading ? <div className="study-loading">Loading topics...</div> : topicItems.length === 0 ? (
          <div className="no-result">No topics available for {subject.name} ({examType}) yet.</div>
        ) : (
          <div className="topic-list">
            {topicItems.map(item => (
              <button type="button" key={item.name} className="topic-card" onClick={() => void launchStudy(subject.name, { topic: item.name })} disabled={actionLoading !== null}>
                <div className="topic-left">
                  <div className="topic-dot" style={{background: subject.color}}></div>
                  <div>
                    <div className="topic-title">{item.name}</div>
                    <div className="topic-meta">{item.count} Question{item.count===1?'':'s'} • {examType}</div>
                  </div>
                </div>
                <span className="topic-chevron">{actionLoading === `topic:${item.name}` ? '…' : <ChevronRight size={18} />}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="study-page">
      <div className="study-header">
        <h1>Study {examType}</h1>
        <p>Choose a subject, then study by topic or by year</p>
      </div>

      <div className="dept-tabs" style={{display:'flex', gap:8, margin:'12px 0', overflowX:'auto'}}>
        {[
          {id:'ALL', label:'All'},
          {id:'SCIENCE', label:'Science'},
          {id:'ART', label:'Art'},
          {id:'COMMERCIAL', label:'Commercial'},
        ].map(t => (
          <button key={t.id} onClick={()=>setActiveDept(t.id as any)}
            style={{
              padding:'8px 16px', borderRadius:20, border:'1px solid #e5e7eb',
              background: activeDept===t.id? '#111827' : '#fff',
              color: activeDept===t.id? '#fff' : '#374151',
              fontWeight:600, fontSize:13, whiteSpace:'nowrap'
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="study-search">
        <div className="search-wrapper">
          <Search size={18} className="search-icon" />
          <input placeholder="Search subject..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          {searchQuery && <button onClick={() => setSearchQuery("")}><X size={16}/></button>}
        </div>
      </div>

      {catalogError && <p className="admin-error" role="alert" style={{marginBottom:12}}>{catalogError}</p>}
      {catalogLoading && <div className="study-loading">Loading subjects and available questions...</div>}

      <div className="subject-grid1">
        {filteredSubjects.map(subject => {
          const Icon = subject.icon
          const tcount = availableTopicsFor(subject.name).length
          const ycount = availableYearsFor(subject.name).length
          const qcount = countForSubject(subject.name)
          return (
            <button type="button" key={subject.id} className="subject-card1 study-subject-button" onClick={() => openSubject(subject.id)}>
              <div className="subject-left">
                <div className="subject-icon" style={{background: `${subject.color}18`, color: subject.color}}>
                  <Icon size={20} />
                </div>
                <div className="subject-info">
                  <h4 className="subject-name">{subject.name}</h4>
                  <div className="subject-meta">{subject.dept} • {tcount} Topics • {ycount} Years • {qcount}Q</div>
                </div>
              </div>
              <span className="subject-action"><ChevronRight size={20} /></span>
            </button>
          )
        })}
      </div>

      {filteredSubjects.length === 0 && (
        <div className="no-result">No subject found for "{searchQuery}" in {activeDept}</div>
      )}

      <div className="study-tip">
        💡 <b>How it works:</b> Choose a subject, then pick <b>Study by Topic</b> or <b>Study by Year</b>. Questions come from Study Management and match your selection.
      </div>
    </div>
  )
}
