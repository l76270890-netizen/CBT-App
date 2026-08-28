type Props = {
  setActivePage: (page: string) => void
  setTestConfig: (config: any) => void
  selectedExam: string
}

import { useState } from 'react'
import './Subjects.css'

export default function Subjects({ setActivePage, setTestConfig, selectedExam }: Props) {
  const [selectedSubjects, setSelectedSubjects] = useState<any[]>([])

  const examData: any = {
    JAMB: [
      { subject: 'Use of English', questions: 60, icon: '📖', years: '2015-2025', required: true },
      { subject: 'Mathematics', questions: 50, icon: '🧮', years: '2015-2025' },
      { subject: 'Biology', questions: 50, icon: '🧬', years: '2015-2025' },
      { subject: 'Chemistry', questions: 50, icon: '⚗️', years: '2015-2025' },
      { subject: 'Physics', questions: 50, icon: '⚡', years: '2015-2025' },
      { subject: 'Government', questions: 50, icon: '🏛️', years: '2015-2025' },
      { subject: 'Economics', questions: 50, icon: '💰', years: '2015-2025' },
      { subject: 'Literature', questions: 50, icon: '📚', years: '2015-2025' },
    ],
    WAEC: [
      { subject: 'English Language', questions: 100, icon: '📖', years: '2010-2024', required: true },
      { subject: 'Mathematics', questions: 50, icon: '🧮', years: '2010-2024' },
      { subject: 'Biology', questions: 50, icon: '🧬', years: '2010-2024' },
      { subject: 'Chemistry', questions: 50, icon: '⚗️', years: '2010-2024' },
      { subject: 'Physics', questions: 50, icon: '⚡', years: '2010-2024' },
      { subject: 'Economics', questions: 50, icon: '💰', years: '2010-2024' },
    ],
    'POST UTME': [
      { subject: 'Use of English', questions: 15, icon: '📖', years: '2020-2025' },
      { subject: 'Mathematics', questions: 10, icon: '🧮', years: '2020-2025' },
      { subject: 'Biology', questions: 10, icon: '🧬', years: '2020-2025' },
      { subject: 'Chemistry', questions: 10, icon: '⚗️', years: '2020-2025' },
      { subject: 'Physics', questions: 10, icon: '⚡', years: '2020-2025' },
    ],
  }

  const subjects = examData[selectedExam] || []
  const maxSubjects = selectedExam === 'JAMB'? 4 : 6

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
      subjects: selectedSubjects, // <-- NOW ARRAY OF OBJECTS
      totalQuestions: totalQuestions,
      year: '2024',
      duration: Math.ceil(totalQuestions * 1.2), // 1.2 min per question
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
        <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
          <button className="back-btn" onClick={() => setActivePage('exams')}>←</button>
          <h1>{selectedExam} Subject Selection</h1>
        </div>

        <div className="exams-info-section">
          <div className="test-type-label">TEST TYPE</div>
          <div className="test-type-title">Objective Questions</div>
          <div className="exams-desc">
            Select between 1 and {maxSubjects} subjects. Once selected, questions will be available for practice.
          </div>
        </div>
      </div>

      <div className="alert-card">
        <div className="alert-icon">i</div>
        <div>
          <div className="alert-text">All selected subjects will be available offline after download</div>
        </div>
      </div>

      <div className="subject-list">
        {subjects.map((item: any) => (
          <div
            key={item.subject}
            className={`subject-card ${isSelected(item.subject)? 'selected' : ''}`}
            onClick={() => toggleSubject(item)}
          >
            <div className="subject-icon-wrap">{item.icon}</div>
            <div className="subject-details">
              <div className="subject-name">
                {item.subject}
                {item.required && <span className="required-badge">REQUIRED</span>}
              </div>
              <div className="subject-meta">
                {item.questions} Questions • {item.years}
              </div>
            </div>
            <div className="checkbox">
              {isSelected(item.subject)? '✓' : ''}
            </div>
          </div>
        ))}
      </div>

      {selectedSubjects.length > 0 && (
        <div className="sticky-continue">
          <div className="selected-summary">
            {selectedSubjects.length}/{maxSubjects} Subjects • {totalQs} Questions Total
          </div>
          <button className="btn-continue" onClick={handleContinue}>
            CONTINUE TO SETUP
          </button>
        </div>
      )}
    </div>
  )
}