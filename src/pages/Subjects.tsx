type Props = {
  setActivePage: (page: string) => void
  setTestConfig: (config: any) => void
  selectedExam: string
}

import { useState, useEffect, useMemo } from 'react'
import { BookOpen, Calculator, Atom, Beaker, Zap, Landmark, DollarSign, Library, ArrowLeft, Search, Check } from 'lucide-react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import './Subjects.css'

type SubjectItem = {
  subject: string
  questions: number
  years: string
  required?: boolean
}

export default function Subjects({ setActivePage, setTestConfig, selectedExam }: Props) {
  const [selectedSubjects, setSelectedSubjects] = useState<SubjectItem[]>([])
  const [search, setSearch] = useState("")
  const [subjects, setSubjects] = useState<SubjectItem[]>([])
  const [loading, setLoading] = useState(true)

  const iconMap: any = {
    'Use of English': BookOpen, 'English Language': BookOpen, 'English': BookOpen,
    'Mathematics': Calculator, 'Maths': Calculator,
    'Biology': Atom, 'Chemistry': Beaker, 'Physics': Zap,
    'Government': Landmark, 'Economics': DollarSign, 'Literature': Library
  }

  // GRAB FROM FIREBASE
  useEffect(() => {
    const fetchSubjects = async () => {
      setLoading(true)
      try {
        // 1. Try questions collection
        let q = query(collection(db, "questions"), where("examType", "==", selectedExam))
        let snap = await getDocs(q)

        if (snap.empty) {
          // try exams collection as fallback
          q = query(collection(db, "exams"), where("examType", "==", selectedExam))
          snap = await getDocs(q)
        }

        // Group by subject
        const map: Record<string, { count: number; years: Set<string> }> = {}

        snap.docs.forEach(doc => {
          const data: any = doc.data()
          const subj = data.subject || data.subjectName || "General"
          const year = data.year? String(data.year) : ""
          if (!map[subj]) map[subj] = { count: 0, years: new Set() }
          map[subj].count += 1
          if (year) map[subj].years.add(year)
        })

        const grouped: SubjectItem[] = Object.entries(map).map(([subject, info]) => {
          const yearsArr = Array.from(info.years).sort()
          const yearsText = yearsArr.length > 1? `${yearsArr[0]}-${yearsArr[yearsArr.length-1]}` : yearsArr[0] || '2024'
          return {
            subject,
            questions: info.count,
            years: yearsText,
            required: subject.toLowerCase().includes('english')
          }
        })

        // If still empty, try fetch all and filter locally (case-insensitive)
        if (grouped.length === 0) {
          const allQ = await getDocs(collection(db, "questions"))
          const filteredDocs = allQ.docs.filter(d => {
            const et = (d.data().examType || "").toLowerCase()
            return et === selectedExam.toLowerCase()
          })
          const map2: Record<string, { count: number; years: Set<string> }> = {}
          filteredDocs.forEach(doc => {
            const data: any = doc.data()
            const subj = data.subject || "General"
            const year = data.year? String(data.year) : ""
            if (!map2[subj]) map2[subj] = { count: 0, years: new Set() }
            map2[subj].count += 1
            if (year) map2[subj].years.add(year)
          })
          const grouped2 = Object.entries(map2).map(([subject, info]) => ({
            subject,
            questions: info.count,
            years: Array.from(info.years).join(', ') || '2024',
            required: subject.toLowerCase().includes('english')
          }))
          setSubjects(grouped2)
        } else {
          setSubjects(grouped)
        }

      } catch (e) {
        console.log(e)
      } finally {
        setLoading(false)
      }
    }

    fetchSubjects()
  }, [selectedExam])

  const maxSubjects = selectedExam === 'JAMB'? 4 : 6

  // Auto-select English if JAMB
  useEffect(() => {
    const required = subjects.filter(s => s.required)
    if (required.length && selectedSubjects.length === 0) {
      setSelectedSubjects(required)
    }
  }, [subjects])

  const filtered = useMemo(() => {
    if (!search) return subjects
    return subjects.filter(s => s.subject.toLowerCase().includes(search.toLowerCase()))
  }, [search, subjects])

  const toggleSubject = (subjectData: SubjectItem) => {
    const isSelected = selectedSubjects.find(s => s.subject === subjectData.subject)
    if (isSelected) {
      if (subjectData.required) return
      setSelectedSubjects(selectedSubjects.filter(s => s.subject!== subjectData.subject))
    } else {
      if (selectedSubjects.length >= maxSubjects) return
      setSelectedSubjects([...selectedSubjects, subjectData])
    }
  }

  const handleContinue = () => {
    const totalQuestions = selectedSubjects.reduce((sum, s) => sum + s.questions, 0)
    setTestConfig((prev: any) => ({
     ...prev,
      examType: selectedExam,
      subjects: selectedSubjects,
      totalQuestions,
      year: '2024',
      duration: Math.ceil(totalQuestions * 1.2) || 60,
      mode: 'exam',
      difficulty: 'Normal',
      showAnswers: false,
      topic: 'All Topics'
    }))
    setActivePage('testConfig')
  }

  const isSelected = (subject: string) => selectedSubjects.some(s => s.subject === subject)
  const totalQs = selectedSubjects.reduce((sum, s) => sum + s.questions, 0)

  return (
    <div className="exams-page1">
      <div className="exams-topbar">
        <div className="topbar-main">
          <button className="back-btn1" onClick={() => setActivePage('home')}><ArrowLeft size={18} /></button>
          <div>
            <h1>{selectedExam}</h1>
            <p>Select {maxSubjects} subjects {subjects.length > 0 && `• ${subjects.length} available`}</p>
          </div>
          <div className="count-badge">{selectedSubjects.length}/{maxSubjects}</div>
        </div>

        <div className="search-wrapper small">
          <Search size={16} className="search-icon" />
          <input placeholder="Search subject..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="alert-card">
          <div className="alert-icon">i</div>
          <div className="alert-text">Subjects are loaded from Firebase • {selectedExam}</div>
        </div>
      </div>

      {loading? <div className="no-result">Loading subjects for {selectedExam}...</div> :
        filtered.length === 0? <div className="no-result">No subjects found for {selectedExam}. Upload questions with examType = {selectedExam}</div> :
          <div className="subject-list">
            {filtered.map((item) => {
              const Icon = iconMap[item.subject] || BookOpen
              const selected = isSelected(item.subject)
              return (
                <div
                  key={item.subject}
                  className={`subject-card ${selected? 'selected' : ''} ${item.required? 'required' : ''}`}
                  onClick={() => toggleSubject(item)}
                >
                  <div className="subject-icon-wrap" style={{ background: selected? '#1d4be3' : '#1e1e1e', color: selected? '#fff' : '#8f9091' }}>
                    <Icon size={20} />
                  </div>
                  <div className="subject-details">
                    <div className="subject-name">
                      {item.subject}
                      {item.required && <span className="required-badge">REQUIRED</span>}
                    </div>
                    <div className="subject-meta">{item.questions} Questions • {item.years}</div>
                  </div>
                  <div className="checkbox">{selected && <Check size={14} />}</div>
                </div>
              )
            })}
          </div>
      }

      {selectedSubjects.length > 0 && (
        <div className="sticky-continue">
          <div className="selected-summary">
            <span>{selectedSubjects.map(s => s.subject.split(' ')[0]).join(' + ')}</span>
            <b>{selectedSubjects.length}/{maxSubjects} • {totalQs} Qs</b>
          </div>
          <button className="btn-continue" onClick={handleContinue} disabled={selectedExam === 'JAMB' && selectedSubjects.length!== 4}>
            {selectedExam === 'JAMB' && selectedSubjects.length!== 4? `Select ${4 - selectedSubjects.length} more` : 'CONTINUE TO SETUP'}
          </button>
        </div>
      )}
    </div>
  )
}