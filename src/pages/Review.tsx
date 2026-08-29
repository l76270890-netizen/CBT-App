type Props = { setActivePage: (page: string) => void }

import { useState, useEffect } from 'react'
import './Review.css'

export default function Review({ setActivePage }: Props) {
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    const data = localStorage.getItem('lastTestResult')
    if (data) setResult(JSON.parse(data))
  }, [])

  if (!result) return <div>Loading...</div>

  // Mock questions - replace with your real questions from localStorage
  const questions = Array.from({length: result.total}).map((_, i) => ({
    id: i+1,
    question: `Question ${i+1}: Which of the following is correct?`,
    options: ['Option A', 'Option B', 'Option C', 'Option D'],
    correct: Math.floor(Math.random() * 4),
    userAnswer: result.answers[i]
  }))

  return (
    <div className="review-page">
      <div className="review-header">
        <button className="back-btn" onClick={() => setActivePage('result')}>←</button>
        <h1>Review Answers</h1>
      </div>

      <div className="review-list">
        {questions.map((q, i) => (
          <div key={i} className="review-card">
            <div className="review-q-header">
              <span>Question {i+1}</span>
              <span className={`status ${q.userAnswer === q.correct? 'correct' : 'wrong'}`}>
                {q.userAnswer === q.correct? '✓ Correct' : '✕ Wrong'}
              </span>
            </div>
            <p className="review-q-text">{q.question}</p>
            <div className="review-options">
              {q.options.map((opt, idx) => (
                <div key={idx} className={`review-option 
                  ${idx === q.correct? 'correct-answer' : ''}
                  ${idx === q.userAnswer && idx!== q.correct? 'wrong-answer' : ''}
                `}>
                  <span className="opt-label">{String.fromCharCode(65 + idx)}</span>
                  {opt}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}