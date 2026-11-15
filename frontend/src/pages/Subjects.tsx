import { useState, useEffect, useMemo } from 'react'
import { BookOpen, Calculator, Atom, Beaker, Zap, Landmark, DollarSign, Library, ArrowLeft, Search, Check } from 'lucide-react'
import './Subjects.css'
import { apiRequest } from '../api'

type SubjectItem = { subject: string; questions: number; years: string; required?: boolean; questionsByYear?: Record<string, number> }
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
    'Government': Landmark, 'Economics': DollarSign, 'Literature': Library,
    'Literature in English': Library,
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

        if (selectedExamId) {
          const availPayload = await apiRequest<any>(`/api/exams/${selectedExamId}/availability`)
          const availability = (availPayload?.availability && typeof availPayload.availability === 'object') ? availPayload.availability : {}
          const names = Array.isArray(availPayload?.subjects) && availPayload.subjects.length ? availPayload.subjects : examSubjects
          const grouped: SubjectItem[] = names.map((subject: string) => {
            const byYear = (availability[subject] && typeof availability[subject] === 'object') ? availability[subject] as Record<string, number> : {}
            const yearEntries = Object.entries(byYear).filter(([, c]) => Number(c) > 0).sort((a, b) => Number(b[0]) - Number(a[0]))
            const total = yearEntries.reduce((sum, [, c]) => sum + Number(c), 0)
            return {
              subject,
              questions: total,
              years: yearEntries.length ? yearEntries.map(([y]) => y).join(', ') : 'No questions yet',
              required: subject.toLowerCase().includes('english'),
              questionsByYear: yearEntries.reduce<Record<string, number>>((acc, [y, c]) => { acc[y] = Number(c); return acc }, {}),
            }
          })
          setSubjects(grouped.length > 0 ? grouped : [])
        } else {
          const grouped: SubjectItem[] = examSubjects.map(subject => ({
            subject,
            questions: 0,
            years: 'No questions yet',
            required: subject.toLowerCase().includes('english'),
            questionsByYear: {},
          }))
          setSubjects(grouped)
        }
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "Could not load subjects.")
        setSubjects([])
      } finally {
        setLoading(false)
      }
    }
    fetchSubjects()
  }, [selectedExam, selectedExamId, configuredSubjects])

  const maxSubjects = subjects.length
  useEffect(() => {
    const required = subjects.filter(s => s.required)
    if (required.length && selectedSubjects.length === 0) { setSelectedSubjects(required) }
  }, [subjects])

  const filtered = useMemo(() => { if (!search) return subjects; return subjects.filter(s => s.subject.toLowerCase().includes(search.toLowerCase())) }, [search, subjects])
  const toggleSubject = (subjectData: SubjectItem) => {
    const isSelected = selectedSubjects.find(s => s.subject === subjectData.subject)
    if (isSelected) { if (subjectData.required) return; setSelectedSubjects(selectedSubjects.filter(s => s.subject !== subjectData.subject)) }
    else { if (selectedSubjects.length >= maxSubjects) return; setSelectedSubjects([...selectedSubjects, subjectData]) }
  }
  const handleContinue = () => {
    if (selectedSubjects.length === 0) return
    const totalQuestions = selectedSubjects.reduce((sum, s) => sum + s.questions, 0)
    const allYears = Array.from(new Set(selectedSubjects.flatMap(s => Object.keys(s.questionsByYear || {})))).sort((a, b) => Number(b) - Number(a))
    const defaultYear = allYears[0] || ''
    setTestConfig((prev: any) => ({ ...prev, examType: selectedExam, subjects: selectedSubjects, totalQuestions, year: defaultYear, duration: Math.ceil(totalQuestions * 1.2) || 60, mode: prev.mode || 'exam', difficulty: prev.difficulty || 'Normal', showAnswers: prev.mode === 'practice', topic: 'All Topics' }))
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
        <div className="alert-card"><div className="alert-icon">i</div><div className="alert-text">Subjects for {selectedExam}. Year-specific availability is applied on the next step.</div></div>
      </div>
      {loading ? <div className="no-result">Loading {selectedExam} subjects...</div> :
        loadError ? <div className="no-result" role="alert">{loadError}</div> : filtered.length === 0 ? <div className="no-result">No subjects for {selectedExam}. Add in Admin.</div> :
          <div className="subject-list">
            {filtered.map((item) => {
              const Icon = iconMap[item.subject] || BookOpen
              const selected = isSelected(item.subject)
              return (
                <div key={item.subject} className={`subject-card ${selected ? 'selected' : ''} ${item.required ? 'required' : ''}`} onClick={() => toggleSubject(item)}>
                  <div className="subject-icon-wrap" style={{ background: selected ? 'var(--primary, #1d4be3)' : 'var(--bg-raised, #1e1e1e)', color: selected ? '#fff' : 'var(--text-secondary, #8f9091)' }}><Icon size={20} /></div>
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
          <button className="btn-continue" onClick={handleContinue}>CONTINUE TO SETUP</button>
        </div>
      )}
    </div>
  )
}
