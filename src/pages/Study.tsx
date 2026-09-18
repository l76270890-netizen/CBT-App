type Props = {
  setActivePage: (page: string) => void
  selectedExam: string
  setTestConfig: (config: any) => void
}

import { useState, useMemo } from 'react'
import { BookOpen, Calculator, Atom, Beaker, Zap, Landmark, Search, X, ChevronRight, ArrowLeft, Play } from 'lucide-react'
import './Study.css'

export default function Study({ setActivePage, selectedExam, setTestConfig }: Props) {
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const subjects = [
    { id: 'english', name: 'English Language', icon: BookOpen, topics: 42, color: '#3B82F6', questions: 60 },
    { id: 'math', name: 'Mathematics', icon: Calculator, topics: 38, color: '#10B981', questions: 40 },
    { id: 'biology', name: 'Biology', icon: Atom, topics: 45, color: '#8B5CF6', questions: 40 },
    { id: 'chemistry', name: 'Chemistry', icon: Beaker, topics: 36, color: '#F59E0B', questions: 40 },
    { id: 'physics', name: 'Physics', icon: Zap, topics: 40, color: '#EF4444', questions: 40 },
    { id: 'govt', name: 'Government', icon: Landmark, topics: 50, color: '#6366F1', questions: 40 },
  ]

  const topics: Record<string, string[]> = {
    english: ['Comprehension', 'Lexis & Structure', 'Oral English', 'Summary'],
    math: ['Algebra', 'Trigonometry', 'Probability', 'Calculus'],
    biology: ['Cell Biology', 'Genetics', 'Ecology', 'Human Anatomy'],
    chemistry: ['Atomic Structure', 'Organic Chemistry', 'Acids & Bases', 'Mole Concept'],
    physics: ['Mechanics', 'Electricity', 'Waves', 'Modern Physics'],
    govt: ['Constitution', 'Political Parties', 'Elections', 'International Relations'],
  }

  const filteredSubjects = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return subjects
    return subjects.filter(s => s.name.toLowerCase().includes(q) || s.id.includes(q))
  }, [searchQuery])

  const startSubjectTest = (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId)!
    setTestConfig({
      examType: selectedExam,
      subjects: [subjectId],
      totalQuestions: subject.questions,
      year: 'All',
      duration: subjectId === 'english'? 60 : 40,
      mode: 'exam',
      difficulty: 'Normal',
      showAnswers: false
    })
    setActivePage('test')
  }

  // Topic view
  if (selectedSubject) {
    const subject = subjects.find(s => s.id === selectedSubject)!
    const Icon = subject.icon
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
              <p>{selectedExam} • {topics[selectedSubject].length} Topics • {subject.questions} Questions</p>
            </div>
          </div>
          <button className="start-test-btn primary" onClick={() => startSubjectTest(subject.id)}>
            <Play size={16} /> Start Full Test
          </button>
        </div>

        <div className="topic-list">
          {topics[selectedSubject].map(topic => (
            <div key={topic} className="topic-card" onClick={() => startSubjectTest(selectedSubject)}>
              <div className="topic-left">
                <div className="topic-dot" style={{background: subject.color}}></div>
                <div>
                  <div className="topic-title">{topic}</div>
                  <div className="topic-meta">12 Questions • 15 min • {selectedExam}</div>
                </div>
              </div>
              <ChevronRight size={18} className="topic-chevron" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Subject list view
  return (
    <div className="study-page">
      <div className="study-header">
        <h1>Study {selectedExam}</h1>
        <p>Tap name to start test • Tap arrow to see topics</p>
      </div>

      <div className="study-search">
        <div className="search-wrapper">
          <Search size={18} className="search-icon" />
          <input
            placeholder="Search subject..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && <button onClick={() => setSearchQuery("")}><X size={16}/></button>}
        </div>
      </div>

      <div className="subject-grid1">
        {filteredSubjects.map(subject => {
          const Icon = subject.icon
          return (
            <div key={subject.id} className="subject-card1">
              <div className="subject-left" onClick={() => startSubjectTest(subject.id)}>
                <div className="subject-icon" style={{background: `${subject.color}18`, color: subject.color}}>
                  <Icon size={20} />
                </div>
                <div className="subject-info">
                  <h4 className="subject-name">{subject.name}</h4>
                  <div className="subject-meta">{subject.topics} Topics • {subject.questions}Q</div>
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
        <div className="no-result">No subject found for "{searchQuery}"</div>
      )}

      <div className="study-tip">
        💡 <b>How it works:</b> Click subject name = start full test. Click arrow = view topics breakdown.
      </div>
    </div>
  )
}