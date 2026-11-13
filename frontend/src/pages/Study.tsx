type Props = {
  setActivePage: (page: string) => void
  selectedExam: string
  setTestConfig: (config: any) => void
}

import { useState, useMemo, useEffect } from 'react'
import { BookOpen, Calculator, Atom, Beaker, Zap, Landmark, Search, X, ChevronRight, ArrowLeft, Play, Feather, Scale, ShoppingBag, Leaf, BarChart3 } from 'lucide-react'
import { apiRequest, asArray } from '../api'
import './Study.css'

type SubjectMeta = { id: string; name: string; icon: any; color: string; dept: 'ALL' | 'SCIENCE' | 'ART' | 'COMMERCIAL' }

export default function Study({ setActivePage, selectedExam, setTestConfig }: Props) {
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeDept, setActiveDept] = useState<'ALL' | 'SCIENCE' | 'ART' | 'COMMERCIAL'>('ALL')
  const [catalog, setCatalog] = useState<{ topicsBySubject: Record<string,string[]>; availability: any }>({ topicsBySubject: {}, availability: {} })
  const [catalogError, setCatalogError] = useState("")

  const examType = (selectedExam || 'JAMB').toString()

  useEffect(() => {
    let cancelled = false
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

  const countFor = (subjectName: string, topic?: string) => {
    const byExam = catalog.availability?.[examType] || {}
    const bySubj = byExam?.[subjectName] || {}
    const topics = topic ? [topic] : Object.keys(bySubj)
    let total = 0
    for (const t of topics) {
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

  const startSubjectTest = async (subjectName: string, topic?: string) => {
    try {
      const params = new URLSearchParams({ examType, subject: subjectName })
      if (topic) params.set('topics', topic)
      const rows = await apiRequest<any[]>(`/api/study/questions?${params.toString()}`)
      const questions = asArray<any>(rows).map((d: any, i: number) => ({
        id: d.id ?? `sq-${i}`,
        subject: d.subject || subjectName,
        topic: d.topic || topic || '',
        question: d.question,
        imageUrl: d.imageUrl || d.image_url || undefined,
        options: Array.isArray(d.options) ? d.options : [d.options?.A, d.options?.B, d.options?.C, d.options?.D],
        answer: typeof d.answer === 'number' ? d.answer : Math.max(0, ['A','B','C','D'].indexOf(String(d.correctAnswer || d.answer || 'A').toUpperCase())),
        explanation: d.explanation || '',
      })).filter((q: any) => q.question && Array.isArray(q.options) && q.options.length === 4)
      if (!questions.length) {
        alert(topic ? `No study questions found for ${subjectName} • ${topic} (${examType}).` : `No study questions found for ${subjectName} (${examType}).`)
        return
      }
      localStorage.setItem('current_questions', JSON.stringify(questions))
      setTestConfig({
        examType,
        subjects: [subjectName],
        totalQuestions: questions.length,
        year: 'All',
        duration: subjectName.toLowerCase().includes('english') ? 60 : 40,
        ...(topic ? { topic } : {}),
        mode: 'practice',
        difficulty: 'Normal',
        showAnswers: true,
        fromStudy: true,
      })
      setActivePage('test')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not load study questions.')
    }
  }

  if (selectedSubject) {
    const subject = subjects.find(s => s.id === selectedSubject)!
    const Icon = subject.icon
    const tlist = topicsFor(subject.name)
    const total = countFor(subject.name)
    return (
      <div className="study-page">
        <div className="study-header topic-header">
          <button className="back-btn" onClick={() => setSelectedSubject(null)}>
            <ArrowLeft size={18} /> Back
          </button>
          <div className="topic-header-main">
            <div className="subject-icon large" style={{background: `${subject.color}20`, color: subject.color}}>
              <Icon size={24} />
            </div>
            <div>
              <h1>{subject.name}</h1>
              <p>{examType} • {tlist.length} Topics • {total} Questions</p>
            </div>
          </div>
          <button className="start-test-btn primary" onClick={() => void startSubjectTest(subject.name)}>
            <Play size={16} /> Start Full Test
          </button>
        </div>
        {catalogError && <p className="admin-error" role="alert" style={{marginBottom:12}}>{catalogError}</p>}
        <div className="topic-list">
          {tlist.map(topic => {
            const c = countFor(subject.name, topic)
            return (
              <div key={topic} className="topic-card" onClick={() => void startSubjectTest(subject.name, topic)}>
                <div className="topic-left">
                  <div className="topic-dot" style={{background: subject.color}}></div>
                  <div>
                    <div className="topic-title">{topic}</div>
                    <div className="topic-meta">{c} Questions • {examType}</div>
                  </div>
                </div>
                <ChevronRight size={18} className="topic-chevron" />
              </div>
            )
          })}
          {tlist.length === 0 && <div className="no-result">No topics available for this subject.</div>}
        </div>
      </div>
    )
  }

  return (
    <div className="study-page">
      <div className="study-header">
        <h1>Study {examType}</h1>
        <p>Tap name to start test • Tap arrow to see topics</p>
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

      <div className="subject-grid1">
        {filteredSubjects.map(subject => {
          const Icon = subject.icon
          const tcount = topicsFor(subject.name).length
          const qcount = countFor(subject.name)
          return (
            <div key={subject.id} className="subject-card1">
              <div className="subject-left" onClick={() => void startSubjectTest(subject.name)}>
                <div className="subject-icon" style={{background: `${subject.color}18`, color: subject.color}}>
                  <Icon size={20} />
                </div>
                <div className="subject-info">
                  <h4 className="subject-name">{subject.name}</h4>
                  <div className="subject-meta">{subject.dept} • {tcount} Topics • {qcount}Q</div>
                </div>
              </div>
              <button className="subject-action" onClick={() => setSelectedSubject(subject.id)}>
                <ChevronRight size={20} />
              </button>
            </div>
          )
        })}
      </div>

      {filteredSubjects.length === 0 && (
        <div className="no-result">No subject found for "{searchQuery}" in {activeDept}</div>
      )}

      <div className="study-tip">
        💡 <b>How it works:</b> Tap a subject to practice all its topics (all years). Tap the arrow to pick a specific topic. Questions come from Study Management.
      </div>
    </div>
  )
}
