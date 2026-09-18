type Props = {
  setActivePage: (page: string) => void
  setTestConfig: (config: any) => void
  selectedExam: string
}

import { useState, useMemo } from 'react'
import { BookOpen, Calculator, Atom, Beaker, Zap, Landmark, DollarSign, Library, ArrowLeft, Search, Check } from 'lucide-react'
import './Subjects.css'

export default function Subjects({ setActivePage, setTestConfig, selectedExam }: Props) {
  const [selectedSubjects, setSelectedSubjects] = useState<any[]>([])
  const [search, setSearch] = useState("")

  const iconMap: any = {
    'Use of English': BookOpen, 'English Language': BookOpen,
    'Mathematics': Calculator, 'Biology': Atom, 'Chemistry': Beaker,
    'Physics': Zap, 'Government': Landmark, 'Economics': DollarSign, 'Literature': Library
  }

  const examData: any = {
    JAMB: [
      { subject: 'Use of English', questions: 60, years: '2015-2025', required: true },
      { subject: 'Mathematics', questions: 40, years: '2015-2025' },
      { subject: 'Biology', questions: 40, years: '2015-2025' },
      { subject: 'Chemistry', questions: 40, years: '2015-2025' },
      { subject: 'Physics', questions: 40, years: '2015-2025' },
      { subject: 'Government', questions: 40, years: '2015-2025' },
      { subject: 'Economics', questions: 40, years: '2015-2025' },
      { subject: 'Literature', questions: 40, years: '2015-2025' },
    ],
    WAEC: [
      { subject: 'English Language', questions: 60, years: '2010-2024', required: true },
      { subject: 'Mathematics', questions: 50, years: '2010-2024' },
      { subject: 'Biology', questions: 50, years: '2010-2024' },
      { subject: 'Chemistry', questions: 50, years: '2010-2024' },
      { subject: 'Physics', questions: 50, years: '2010-2024' },
      { subject: 'Economics', questions: 50, years: '2010-2024' },
    ],
    'POST UTME': [
      { subject: 'Use of English', questions: 15, years: '2020-2025' },
      { subject: 'Mathematics', questions: 10, years: '2020-2025' },
      { subject: 'Biology', questions: 10, years: '2020-2025' },
      { subject: 'Chemistry', questions: 10, years: '2020-2025' },
      { subject: 'Physics', questions: 10, years: '2020-2025' },
    ],
  }

  const subjects = examData[selectedExam] || []
  const maxSubjects = selectedExam === 'JAMB'? 4 : 6

  // Auto-select required for JAMB
  useState(() => {
    const required = subjects.filter((s: any) => s.required)
    if(required.length && selectedSubjects.length===0) setSelectedSubjects(required)
  })

  const filtered = useMemo(() => {
    if(!search) return subjects
    return subjects.filter((s: any) => s.subject.toLowerCase().includes(search.toLowerCase()))
  }, [search, subjects])

  const toggleSubject = (subjectData: any) => {
    const isSelected = selectedSubjects.find(s => s.subject === subjectData.subject)
    if (isSelected) {
      if(subjectData.required) return
      setSelectedSubjects(selectedSubjects.filter(s => s.subject!== subjectData.subject))
    } else {
      if(selectedSubjects.length >= maxSubjects) return
      setSelectedSubjects([...selectedSubjects, subjectData])
    }
  }

  const handleContinue = () => {
    const totalQuestions = selectedSubjects.reduce((sum, s) => sum + s.questions, 0)
    setTestConfig({
      examType: selectedExam,
      subjects: selectedSubjects,
      totalQuestions,
      year: '2024',
      duration: Math.ceil(totalQuestions * 1.2),
      mode: 'exam',
      difficulty: 'Normal',
      showAnswers: false,
      topic: 'All Topics'
    })
    setActivePage('testConfig')
  }

  const isSelected = (subject: string) => selectedSubjects.some(s => s.subject === subject)
  const totalQs = selectedSubjects.reduce((sum, s) => sum + s.questions, 0)

  return (
    <div className="exams-page1">
      <div className="exams-topbar">
        <div className="topbar-main">
          <button className="back-btn1" onClick={() => setActivePage('exams')}><ArrowLeft size={18}/></button>
          <div>
            <h1>{selectedExam}</h1>
            <p>Select {maxSubjects} subjects</p>
          </div>
          <div className="count-badge">{selectedSubjects.length}/{maxSubjects}</div>
        </div>

        <div className="search-wrapper small">
          <Search size={16} className="search-icon"/>
          <input placeholder="Search subject..." value={search} onChange={e=>setSearch(e.target.value)} />
        </div>

        <div className="alert-card">
          <div className="alert-icon">i</div>
          <div className="alert-text">All selected subjects will be available offline after download</div>
        </div>
      </div>

      <div className="subject-list">
        {filtered.map((item: any) => {
          const Icon = iconMap[item.subject] || BookOpen
          const selected = isSelected(item.subject)
          return (
            <div
              key={item.subject}
              className={`subject-card ${selected? 'selected' : ''} ${item.required? 'required' : ''}`}
              onClick={() => toggleSubject(item)}
            >
              <div className="subject-icon-wrap" style={{background: selected? '#1d4be3' : '#1e1e1e', color: selected? '#fff' : '#8f9091'}}>
                <Icon size={20} />
              </div>
              <div className="subject-details">
                <div className="subject-name">
                  {item.subject}
                  {item.required && <span className="required-badge">REQUIRED</span>}
                </div>
                <div className="subject-meta">{item.questions} Questions • {item.years}</div>
              </div>
              <div className="checkbox">{selected && <Check size={14}/>}</div>
            </div>
          )
        })}
      </div>

      {selectedSubjects.length > 0 && (
        <div className="sticky-continue">
          <div className="selected-summary">
            <span>{selectedSubjects.map(s=>s.subject.split(' ')[0]).join(' + ')}</span>
            <b>{selectedSubjects.length}/{maxSubjects} • {totalQs} Qs</b>
          </div>
          <button className="btn-continue" onClick={handleContinue} disabled={selectedExam==='JAMB' && selectedSubjects.length!==4}>
            {selectedExam==='JAMB' && selectedSubjects.length!==4? `Select ${4-selectedSubjects.length} more` : 'CONTINUE TO SETUP'}
          </button>
        </div>
      )}
    </div>
  )
}