type Props = {
  setActivePage: (page: string) => void
  selectedExam: string
  setTestConfig: (config: any) => void
}

import { useState, useMemo } from 'react'
import { BookOpen, Calculator, Atom, Beaker, Zap, Landmark, Search, X, ChevronRight, ArrowLeft, Play, Feather, Scale, ShoppingBag, Leaf, BarChart3 } from 'lucide-react'
import './Study.css'

export default function Study({ setActivePage, selectedExam, setTestConfig }: Props) {
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeDept, setActiveDept] = useState<'ALL' | 'SCIENCE' | 'ART' | 'COMMERCIAL'>('ALL')

  const subjects = [
    // SCIENCE
    { id: 'english', name: 'English Language', icon: BookOpen, topics: 42, color: '#3B82F6', questions: 60, dept: 'ALL' },
    { id: 'math', name: 'Mathematics', icon: Calculator, topics: 38, color: '#10B981', questions: 40, dept: 'SCIENCE' },
    { id: 'biology', name: 'Biology', icon: Atom, topics: 45, color: '#8B5CF6', questions: 40, dept: 'SCIENCE' },
    { id: 'chemistry', name: 'Chemistry', icon: Beaker, topics: 36, color: '#F59E0B', questions: 40, dept: 'SCIENCE' },
    { id: 'physics', name: 'Physics', icon: Zap, topics: 40, color: '#EF4444', questions: 40, dept: 'SCIENCE' },
    { id: 'agric', name: 'Agric Science', icon: Leaf, topics: 32, color: '#16A34A', questions: 40, dept: 'SCIENCE' },

    // ART
    { id: 'govt', name: 'Government', icon: Landmark, topics: 50, color: '#6366F1', questions: 40, dept: 'ART' },
    { id: 'literature', name: 'Literature in English', icon: Feather, topics: 48, color: '#EC4899', questions: 40, dept: 'ART' },
    { id: 'crk', name: 'Christian Rel. Knowledge', icon: BookOpen, topics: 35, color: '#7C3AED', questions: 40, dept: 'ART' },
    { id: 'history', name: 'History', icon: Landmark, topics: 30, color: '#92400E', questions: 40, dept: 'ART' },
    { id: 'economics', name: 'Economics', icon: BarChart3, topics: 40, color: '#059669', questions: 40, dept: 'COMMERCIAL' },

    // COMMERCIAL
    { id: 'commerce', name: 'Commerce', icon: ShoppingBag, topics: 36, color: '#0891B2', questions: 40, dept: 'COMMERCIAL' },
    { id: 'accounting', name: 'Financial Accounting', icon: Calculator, topics: 38, color: '#0F766E', questions: 40, dept: 'COMMERCIAL' },
    { id: 'business', name: 'Business Studies', icon: Scale, topics: 34, color: '#4338CA', questions: 40, dept: 'COMMERCIAL' },
  ]

  const topics: Record<string, string[]> = {
    english: ['Comprehension', 'Lexis & Structure', 'Oral English', 'Summary'],
    math: ['Algebra', 'Trigonometry', 'Probability', 'Calculus'],
    biology: ['Cell Biology', 'Genetics', 'Ecology', 'Human Anatomy'],
    chemistry: ['Atomic Structure', 'Organic Chemistry', 'Acids & Bases', 'Mole Concept'],
    physics: ['Mechanics', 'Electricity', 'Waves', 'Modern Physics'],
    agric: ['Crop Production', 'Animal Husbandry', 'Soil Science', 'Farm Management'],
    govt: ['Constitution', 'Political Parties', 'Elections', 'International Relations'],
    literature: ['African Prose', 'Non-African Prose', 'Poetry', 'Drama'],
    crk: ['Old Testament', 'New Testament', 'Themes', 'Life of Jesus'],
    history: ['Pre-Colonial', 'Colonial Era', 'Independence', 'World History'],
    economics: ['Micro Economics', 'Macro Economics', 'Demand & Supply', 'Market Structure'],
    commerce: ['Trade', 'Business Org', 'Finance', 'Marketing'],
    accounting: ['Double Entry', 'Trial Balance', 'Final Accounts', 'Partnership'],
    business: ['Office Practice', 'Business Law', 'Management', 'Entrepreneurship'],
  }

  const filteredSubjects = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    let list = subjects
    if (activeDept!== 'ALL') {
      list = list.filter(s => s.dept === activeDept || s.dept === 'ALL')
    }
    if (!q) return list
    return list.filter(s => s.name.toLowerCase().includes(q) || s.id.includes(q))
  }, [searchQuery, activeDept])

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
              <p>{selectedExam} • {topics[selectedSubject]?.length} Topics • {subject.questions} Questions</p>
            </div>
          </div>
          <button className="start-test-btn primary" onClick={() => startSubjectTest(subject.id)}>
            <Play size={16} /> Start Full Test
          </button>
        </div>
        <div className="topic-list">
          {(topics[selectedSubject] || []).map(topic => (
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

  return (
    <div className="study-page">
      <div className="study-header">
        <h1>Study {selectedExam}</h1>
        <p>Tap name to start test • Tap arrow to see topics</p>
      </div>

      {/* Department Tabs */}
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
                  <div className="subject-meta">{subject.dept} • {subject.topics} Topics • {subject.questions}Q</div>
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
        💡 <b>How it works:</b> Click subject name = start full test. Click arrow = view topics. Filter by Science / Art / Commercial above.
      </div>
    </div>
  )
}
