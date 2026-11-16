import { useState, useEffect, useMemo } from 'react'
import { BookOpen, Search, X, ChevronRight as ChevronRightIcon } from 'lucide-react'
import { examTypes } from '../data/examTypes'
import './Home.css'
import './Exams.css'
import { apiRequest, asArray } from '../api'

type ExamData = {
  id: string
  title: string
  examType: string
  subjects?: string[]
  year: number
  duration: number
  totalQuestions?: number
}

function mapExamRecords(payload: unknown): ExamData[] {
  const data = Array.isArray(payload) ? payload : asArray<any>((payload as any)?.exams)
  return data.filter((exam: unknown) => exam && typeof exam === 'object').map((exam: any) => ({
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
  }))
}

export default function Exams({ setActivePage, setSelectedExam, setTestConfig }: any) {
  const [examsFromDb, setExamsFromDb] = useState<ExamData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [error, setError] = useState("")
  const [subjectCounts, setSubjectCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    const loadExams = async () => {
      try {
        const payload = await apiRequest<unknown>("/api/exams")
        setExamsFromDb(mapExamRecords(payload))
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load exams.")
        setExamsFromDb([])
      } finally {
        setLoading(false)
      }
    }
    void loadExams()
  }, [])

  const examTypeMatches = (dbType: string, key: string) => {
    const a = String(dbType || '').toLowerCase()
    const b = String(key || '').toLowerCase()
    return a === b || (a === 'bece' && b === 'cbt') || (a === 'cbt' && b === 'bece')
  }

  useEffect(() => {
    let cancelled = false
    const resolveCounts = async () => {
      const entries = await Promise.all(examTypes.map(async (exam) => {
        const dbExam = examsFromDb.find(e => examTypeMatches(e.examType, exam.key))
        if (dbExam?.id) {
          try {
            const avail = await apiRequest<any>(`/api/exams/${dbExam.id}/availability`)
            const names = Array.isArray(avail?.subjects) && avail.subjects.length ? avail.subjects : (dbExam.subjects || [])
            const unique = new Set<string>(names.filter((s: any) => typeof s === 'string' && s.trim()))
            const count = unique.size || new Set((dbExam.subjects || []).filter(Boolean)).size
            return [exam.key, count] as const
          } catch {
            const count = new Set((dbExam.subjects || []).filter(Boolean)).size
            return [exam.key, count] as const
          }
        }
        const fallback = new Set((dbExam?.subjects || exam.subjects || []).filter(Boolean)).size
        return [exam.key, fallback] as const
      }))
      if (!cancelled) {
        const next: Record<string, number> = {}
        for (const [k, v] of entries) next[k] = v
        setSubjectCounts(next)
      }
    }
    void resolveCounts()
    return () => { cancelled = true }
  }, [examsFromDb])

  const openExamType = (examKey: string) => {
    const dbExam = examsFromDb.find(exam => examTypeMatches(exam.examType, examKey))
    const resolvedType = dbExam ? dbExam.examType : examKey
    setSelectedExam(resolvedType)
    setTestConfig((prev: any) => ({
      ...prev,
      examType: resolvedType,
      examId: dbExam?.id || '',
      customExamId: dbExam?.id || '',
      examTitle: dbExam?.title || '',
      customTitle: dbExam?.title || '',
      subjects: dbExam?.subjects || [],
      totalQuestions: 0,
      year: '',
      mode: 'exam',
      showAnswers: false,
      topic: 'All Topics',
      jambFlow: String(resolvedType).toUpperCase() === 'JAMB',
      jambLockedSelection: false,
      selectedSubject: undefined,
      years: undefined,
      yearRangeLabel: undefined,
      yearRange: undefined,
    }))
    setActivePage('subjects')
  }

  const filteredExamTypes = useMemo(() => {
    if (!searchQuery) return examTypes
    const q = searchQuery.toLowerCase()
    return examTypes.filter(exam =>
      exam.label.toLowerCase().includes(q) ||
      exam.key.toLowerCase().includes(q) ||
      exam.fullName.toLowerCase().includes(q) ||
      (exam.key === 'CBT' && 'bece'.includes(q))
    )
  }, [searchQuery])

  if (loading) return <div className="exams-container"><p style={{ padding: 20 }}>Loading exams...</p></div>

  return (
    <div className="exams-container">
      <div className="exams-header"><h1>Available Exams</h1><p>Choose an exam to practice</p></div>
        {error && <p role="alert" style={{ color: 'var(--danger, #ef4444)', padding: '0 20px' }}>{error}</p>}
      <div className="search-bar">
        <div className="search-wrapper">
          <Search className="search-icon" size={18} />
          <input type="text" placeholder="Search JAMB, WAEC..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input-box" />
          {searchQuery && <button className="clear-search-btn" onClick={() => setSearchQuery("")}><X size={16} /></button>}
        </div>
      </div>
      <div className="exam-type-grid">
        {filteredExamTypes.map(exam => (
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
              <p className="exam-meta">{(subjectCounts[exam.key] ?? exam.subjects.length)} subjects available</p>
            </div>
            <span className="exam-type-chevron"><ChevronRightIcon size={20} className="chevron" /></span>
          </div>
        ))}
      </div>
      {filteredExamTypes.length === 0 && <div className="no-results">No exam found matching "{searchQuery}"</div>}
    </div>
  )
}
