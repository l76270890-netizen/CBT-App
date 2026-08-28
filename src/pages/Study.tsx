type Props = {
  setActivePage: (page: string) => void
  selectedExam: string
  setTestConfig: (config: any) => void // <-- ADD THIS
}

import { useState } from 'react'
import './Study.css'

export default function Study({ setActivePage, selectedExam, setTestConfig }: Props) { // <-- ADD setTestConfig
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)

  const subjects = [
    { id: 'english', name: 'English Language', icon: '📖', topics: 42, color: '#3B82F6', questions: 60 },
    { id: 'math', name: 'Mathematics', icon: '➗', topics: 38, color: '#10B981', questions: 40 },
    { id: 'biology', name: 'Biology', icon: '🧬', topics: 45, color: '#8B5CF6', questions: 40 },
    { id: 'chemistry', name: 'Chemistry', icon: '🧪', topics: 36, color: '#F59E0B', questions: 40 },
    { id: 'physics', name: 'Physics', icon: '⚡', topics: 40, color: '#EF4444', questions: 40 },
    { id: 'govt', name: 'Government', icon: '🏛️', topics: 50, color: '#6366F1', questions: 40 },
  ]

  const topics = {
    english: ['Comprehension', 'Lexis & Structure', 'Oral English', 'Summary'],
    math: ['Algebra', 'Trigonometry', 'Probability', 'Calculus'],
    biology: ['Cell Biology', 'Genetics', 'Ecology', 'Human Anatomy'],
    chemistry: ['Atomic Structure', 'Organic Chemistry', 'Acids & Bases', 'Mole Concept'],
    physics: ['Mechanics', 'Electricity', 'Waves', 'Modern Physics'],
    govt: ['Constitution', 'Political Parties', 'Elections', 'International Relations'],
  }

  // NEW: Start test for entire subject
  const startSubjectTest = (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId)!
    setTestConfig({
      examType: selectedExam,
      subjects: [subjectId],
      totalQuestions: subject.questions,
      year: 'All',
      duration: subjectId === 'english'? 60 : 40, // JAMB timing
      mode: 'exam',
      difficulty: 'Normal',
      showAnswers: false
    })
    setActivePage('test') // GO TO TESTPAGE
  }

  const handleStartTopic = (topic: string) => {
    setSelectedTopic(topic)
    alert(`Starting: ${selectedSubject?.toUpperCase()} - ${topic}. Will open study notes + questions`)
  }

  if (selectedSubject) {
    const subject = subjects.find(s => s.id === selectedSubject)!
    return (
      <div className="study-page">
        <div className="study-header">
          <button className="back-btn" onClick={() => setSelectedSubject(null)}>←</button>
          <div>
            <h1>{subject.name}</h1>
            <p>{selectedExam} • {topics[selectedSubject as keyof typeof topics].length} Topics</p>
          </div>
          <button className="start-test-btn" onClick={() => startSubjectTest(subject.id)}>
            Start Test
          </button>
        </div>

        <div className="topic-list">
          {topics[selectedSubject as keyof typeof topics].map(topic => (
            <button
              key={topic}
              className="topic-card"
              onClick={() => handleStartTopic(topic)}
            >
              <div className="topic-left">
                <div className="topic-dot" style={{background: subject.color}}></div>
                <div>
                  <div className="topic-title">{topic}</div>
                  <div className="topic-meta">12 Questions • 15 min read</div>
                </div>
              </div>
              <span className="topic-chevron">›</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="study-page">
      <div className="study-header">
        <h1>Study</h1>
        <p>Tap subject name to start test. Tap card to view topics</p>
      </div>

      <div className="subject-grid1">
        {subjects.map(subject => (
          <div key={subject.id} className="subject-card1">
            <button // <-- Make icon clickable to view topics
              className="subject-left"
              onClick={() => setSelectedSubject(subject.id)}
            >
              <div className="subject-icon" style={{background: `${subject.color}20`, color: subject.color}}>
                {subject.icon}
              </div>
              <div className="subject-info">
                <button // <-- Make name clickable to START TEST
                  className="subject-name-btn"
                  onClick={() => startSubjectTest(subject.id)}
                >
                  {subject.name}
                </button>
                <div className="subject-meta">{subject.topics} Topics • {subject.questions}Q Test</div>
              </div>
            </button>
            <button className="subject-action" onClick={() => setSelectedSubject(subject.id)}>›</button>
          </div>
        ))}
      </div>

      <div className="study-tip">
        💡 <b>Pro Tip:</b> Click subject name to start test. Click card to study topics
      </div>
    </div>
  )
}