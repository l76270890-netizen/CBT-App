import { useState, useEffect } from 'react'
import './Review.css'

type Props = { setActivePage: (page: string) => void }

export default function Review({ setActivePage }: Props) {
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    const data = localStorage.getItem('lastTestResult')
    if (data) setResult(JSON.parse(data))
  }, [])

  if (!result) return <div style={{color:'#fff', padding:20}}>Loading review...</div>

  const questions = result.questions || Array.from({length: result.total}).map((_, i) => ({
    id: i+1,
    question: `Question ${i+1}`,
    options: ['Option A', 'Option B', 'Option C', 'Option D'],
    correct: 0,
    explanation: ''
  }))

  return (
    <div className="review-page">
      <div className="review-header">
        <button className="back-btn" onClick={() => setActivePage('result')}>←</button>
        <h1>Review Answers</h1>
      </div>

      <div className="review-list">
        {questions.map((q: any, i: number) => {
          const userAnswer = result.answers?.[i]
          const correctAnswer = q.correct?? q.answer
          const isCorrect = userAnswer === correctAnswer
          return (
            <div key={i} className="review-card">
              <div className="review-q-header">
                <span>Question {i+1}</span>
                <span className={`status ${isCorrect? 'correct' : 'wrong'}`}>
                  {isCorrect? '✓ Correct' : '✕ Wrong'}
                </span>
              </div>
              <p className="review-q-text">{q.question}</p>
              <div className="review-options">
                {q.options?.map((opt: string, idx: number) => (
                  <div key={idx} className={`review-option
                    ${idx === correctAnswer? 'correct-answer' : ''}
                    ${idx === userAnswer && idx!== correctAnswer? 'wrong-answer' : ''}
                  `}>
                    <span className="opt-label">{String.fromCharCode(65 + idx)}</span>
                    {opt}
                  </div>
                ))}
              </div>
              {q.explanation && (
                <div style={{marginTop:10, fontSize:13, opacity:0.8, background:'#1e293b', padding:10, borderRadius:8}}>
                  <b>Explanation:</b> {q.explanation}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div style={{padding:20}}>
        <button className="btn-ghost" onClick={() => setActivePage('practiceHistory')} style={{width:'100%'}}>View History</button>
      </div>
    </div>
  )
}