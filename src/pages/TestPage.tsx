type Props = {
  setActivePage: (page: string) => void
  testConfig: {
    examType: string
    subjects: any[] // <-- CHANGED
    totalQuestions: number
    duration: number
    mode: 'exam' | 'practice'
    showAnswers: boolean
    topicFilter?: string
  }
}

import { useState, useEffect } from 'react'
import './TestPage.css'

export default function Test({ setActivePage, testConfig }: Props) {
  // Generate questions for all selected subjects
  const mockQuestions = Array.from({ length: testConfig.totalQuestions || 10 }).map((_, i) => {
    const subjectIndex = i % testConfig.subjects.length
    const subject = testConfig.subjects[subjectIndex]?.subject || 'JAMB'
    return {
      id: i + 1,
      subject,
      question: `Question ${i + 1}: Which of the following is correct for ${subject}?`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      answer: Math.floor(Math.random() * 4),
      explanation: 'This is the explanation for the correct answer.'
    }
  })

  const [questions] = useState(mockQuestions)
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>(Array(questions.length).fill(null))
  const [timeLeft, setTimeLeft] = useState(testConfig.duration * 60)
  const [showGrid, setShowGrid] = useState(false)

  useEffect(() => {
    if (timeLeft <= 0) { handleSubmit(); return }
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000)
    return () => clearInterval(timer)
  }, [timeLeft])

  const selectAnswer = (optionIndex: number) => {
    const newAnswers = [...answers]
    newAnswers[current] = optionIndex
    setAnswers(newAnswers)
  }

  const handleSubmit = () => {
    const score = answers.reduce((acc, ans, i) => ans === questions[i].answer? acc + 1 : acc, 0)
    localStorage.setItem('lastTestResult', JSON.stringify({ score, total: questions.length, answers }))
    setActivePage('result')
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const q = questions[current]

  return (
    <div className="test-page1">
      <div className="test-header">
        <button className="exit-btn" onClick={() => setActivePage('testConfig')}>✕</button>
        <div className="test-info">
          <div className="test-subject">{q.subject}</div> {/* Shows current question subject */}
          <div className="test-q-count">Question {current + 1} of {questions.length}</div>
        </div>
        <div className={`test-timer ${timeLeft < 300? 'warning' : ''}`}>⏱ {formatTime(timeLeft)}</div>
      </div>

      <div className="test-body">
        <div className="question-card">
          <h2 className="question-text">{q.question}</h2>
          <div className="options">
            {q.options.map((opt, i) => (
              <button key={i} className={`option-btn ${answers[current] === i? 'selected' : ''}`} onClick={() => selectAnswer(i)}>
                <span className="option-label">{String.fromCharCode(65 + i)}</span>
                <span>{opt}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="test-footer">
        <button className="nav-btn" disabled={current === 0} onClick={() => setCurrent(c => c - 1)}>← Previous</button>
        <button className="grid-btn" onClick={() => setShowGrid(!showGrid)}>{current + 1}/{questions.length}</button>
        {current === questions.length - 1? (
          <button className="submit-btn" onClick={handleSubmit}>Submit</button>
        ) : (
          <button className="nav-btn primary" onClick={() => setCurrent(c => c + 1)}>Next →</button>
        )}
      </div>

      {showGrid && (
        <div className="grid-overlay" onClick={() => setShowGrid(false)}>
          <div className="grid-modal" onClick={e => e.stopPropagation()}>
            <h3>Jump to Question</h3>
            <div className="question-grid">
              {questions.map((_, i) => (
                <button key={i} className={`grid-item ${answers[i]!== null? 'answered' : ''} ${current === i? 'active' : ''}`} onClick={() => { setCurrent(i); setShowGrid(false) }}>
                  {i + 1}
                </button>
              ))}
            </div>
            <button className="submit-btn full" onClick={handleSubmit}>Submit Test</button>
          </div>
        </div>
      )}
    </div>
  )
}