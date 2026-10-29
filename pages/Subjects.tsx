import { useState, useEffect, useMemo } from 'react'
import { BookOpen, Calculator, Atom, Beaker, Zap, Landmark, DollarSign, Library, ArrowLeft, Search, Check } from 'lucide-react'
import './Subjects.css'
import { apiRequest, asArray } from '../api'

type SubjectItem = { subject: string; questions: number; years: string; required?: boolean }
type Props = {
  setActivePage: (page: string) => void
  setTestConfig: (updater: (previous: any) => any) => void
  selectedExam: string
  selectedExamId?: string
  configuredSubjects?: Array<string | { subject?: string; name?: string }>
}

export default function Subjects({ setActivePage, setTestConfig, selectedExam, selectedExamId, configuredSubjects = [] }: Props) {
  const [selectedSubjects, setSelectedSubjects] = useState<SubjectItem[]>([])
  const [search, setSearch] = useState("")
  const [subjects, setSubjects] = useState<SubjectItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")

  const iconMap: any = {
    'Use of English': BookOpen, 'English Language': BookOpen, 'English': BookOpen,
    'Mathematics': Calculator, 'Maths': Calculator,
    'Biology': Atom, 'Chemistry': Beaker, 'Physics': Zap,
    'Government': Landmark, 'Economics': DollarSign, 'Literature': Library
  }

  useEffect(() => {
    const fetchSubjects = async () => {
      setLoading(true)
      setLoadError("")
      setSubjects([])
      setSelectedSubjects([])
      setSearch("")
      try {
        const examSubjects = configuredSubjects
          .map(subject => typeof subject === 'string' ? subject : subject?.subject || subject?.name || '')
          .filter(Boolean)
        const map: Record<string, { count: number; years: Set<string> }> = {}
        examSubjects.forEach(subject => { map[subject] = { count: 0, years: new Set() } })

        if (selectedExamId) {
          await Promise.all(examSubjects.map(async subject => {
            const query = new URLSearchParams({ examId: selectedExamId, subject })
            const payload = await apiRequest<unknown>(`/api/questions?${query}`)
            const data = Array.isArray(payload) ? payload : asArray<any>((payload as any)?.questions)
            if (!Array.isArray(data)) throw new Error("Unexpected questions response")
            data.forEach((question: any) => {
              const name = question.subject || subject
              if (!map[name]) map[name] = { count: 0, years: new Set() }
              map[name].count += 1
              if (question.year) map[name].years.add(String(question.year))
            })
          }))
        }

        const grouped: SubjectItem[] = Object.entries(map).map(([subject, info]) => ({
          subject,
          questions: info.count,
          years: Array.from(info.years).join(', ') || '2024',
          required: subject.toLowerCase().includes('english')
        }))
        if (grouped.length === 0) {
          const fallback = selectedExam === 'JAMB'
          ? [{subject:'Use of English',questions:40,years:'2024',required:true},{subject:'Mathematics',questions:40,years:'2024'},{subject:'Biology',questions:40,years:'2024'},{subject:'Chemistry',questions:40,years:'2024'}]
            : [{subject:'Mathematics',questions:20,years:'2024'}]
          setSubjects(fallback)
        } else {
          setSubjects(grouped)
        }
      } catch (e) { setLoadError(e instanceof Error ? e.message : "Could not load subjects."); setSubjects([]); } finally { setLoading(false) }
    }
    fetchSubjects()
  }, [selectedExam, selectedExamId, configuredSubjects])

  const maxSubjects = selectedExam === 'JAMB'? 4 : 6
  useEffect(() => {
    const required = subjects.filter(s => s.required)
    if (required.length && selectedSubjects.length === 0) { setSelectedSubjects(required) }
  }, [subjects])

  const filtered = useMemo(() => { if (!search) return subjects; return subjects.filter(s => s.subject.toLowerCase().includes(search.toLowerCase())) }, [search, subjects])
  const toggleSubject = (subjectData: SubjectItem) => {
    const isSelected = selectedSubjects.find(s => s.subject === subjectData.subject)
    if (isSelected) { if (subjectData.required) return; setSelectedSubjects(selectedSubjects.filter(s => s.subject!== subjectData.subject)) }
    else { if (selectedSubjects.length >= maxSubjects) return; setSelectedSubjects([...selectedSubjects, subjectData]) }
  }
  const handleContinue = () => {
    const totalQuestions = selectedSubjects.reduce((sum, s) => sum + s.questions, 0)
    setTestConfig((prev: any) => ({...prev, examType: selectedExam, subjects: selectedSubjects, totalQuestions, year: '2024', duration: Math.ceil(totalQuestions * 1.2) || 60, mode: 'exam', difficulty: 'Normal', showAnswers: false, topic: 'All Topics'}))
    setActivePage('testConfig')
  }
  const isSelected = (subject: string) => selectedSubjects.some(s => s.subject === subject)
  const totalQs = selectedSubjects.reduce((sum, s) => sum + s.questions, 0)

  return (
    <div className="exams-page1">
      <div className="exams-topbar">
        <div className="topbar-main">
          <button className="back-btn1" onClick={() => setActivePage('home')}><ArrowLeft size={18} /></button>
          <div><h1>{selectedExam}</h1><p>Select {maxSubjects} subjects</p></div>
          <div className="count-badge">{selectedSubjects.length}/{maxSubjects}</div>
        </div>
        <div className="search-wrapper small"><Search size={16} className="search-icon" /><input placeholder="Search subject..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <div className="alert-card"><div className="alert-icon">i</div><div className="alert-text">Subjects for {selectedExam}</div></div>
      </div>
      {loading? <div className="no-result">Loading {selectedExam} subjects...</div> :
        loadError ? <div className="no-result" role="alert">{loadError}</div> : filtered.length === 0? <div className="no-result">No subjects for {selectedExam}. Add in Admin.</div> :
          <div className="subject-list">
            {filtered.map((item) => {
              const Icon = iconMap[item.subject] || BookOpen
              const selected = isSelected(item.subject)
              return (
                <div key={item.subject} className={`subject-card ${selected? 'selected' : ''} ${item.required? 'required' : ''}`} onClick={() => toggleSubject(item)}>
                  <div className="subject-icon-wrap" style={{ background: selected? '#1d4be3' : '#1e1e1e', color: selected? '#fff' : '#8f9091' }}><Icon size={20} /></div>
                  <div className="subject-details"><div className="subject-name">{item.subject}{item.required && <span className="required-badge">REQUIRED</span>}</div><div className="subject-meta">{item.questions} Questions • {item.years}</div></div>
                  <div className="checkbox">{selected && <Check size={14} />}</div>
                </div>
              )
            })}
          </div>
      }
      {selectedSubjects.length > 0 && (
        <div className="sticky-continue">
          <div className="selected-summary"><span>{selectedSubjects.map(s => s.subject.split(' ')[0]).join(' + ')}</span><b>{selectedSubjects.length}/{maxSubjects} • {totalQs} Qs</b></div>
          <button className="btn-continue" onClick={handleContinue} disabled={selectedExam === 'JAMB' && selectedSubjects.length!==4}>
            {selectedExam === 'JAMB' && selectedSubjects.length!==4? `Select ${4 - selectedSubjects.length} more` : 'CONTINUE TO SETUP'}
          </button>
        </div>
      )}
    </div>
  )
}
