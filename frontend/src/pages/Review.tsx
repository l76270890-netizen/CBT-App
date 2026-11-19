import { useState, useEffect } from 'react'
import QuestionImage from '../components/QuestionImage'
import './Review.css'
import { answerLetter, toAnswerIndex } from '../answerUtils'

type Props = { setActivePage: (page: string) => void }

export default function Review({ setActivePage }: Props) {
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    const data = localStorage.getItem('lastTestResult')
    if (data) setResult(JSON.parse(data))
  }, [])

  if (!result) return <div style={{color:'var(--text-main, #fff)', padding:20}}>Loading review...</div>

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
          const userAnswer = toAnswerIndex(result.answers?.[i])
          const correctAnswer = toAnswerIndex(q.correct ?? q.answer)
          const hasCorrectAnswer = correctAnswer >= 0 && correctAnswer < (q.options?.length || 0)
          const hasUserAnswer = userAnswer >= 0 && userAnswer < (q.options?.length || 0)
          const isCorrect = hasCorrectAnswer && hasUserAnswer && userAnswer === correctAnswer
          return (
            <div key={i} className="review-card">
              <div className="review-q-header">
                <span>Question {i+1}</span>
                <span className={`status ${isCorrect ? 'correct' : 'wrong'}`}>
                  {!hasCorrectAnswer ? 'Answer unavailable' : isCorrect ? '✓ Correct' : '✕ Wrong'}
                </span>
              </div>
              <p className="review-q-text">{q.question}</p>
              {(q.imageUrl || q.image_url) && <QuestionImage key={q.imageUrl || q.image_url} className="review-question-image" imageUrl={q.imageUrl || q.image_url} />}
              <div className="review-options">
                {q.options?.map((opt: string, idx: number) => {
                  const isCorrectOption = hasCorrectAnswer && idx === correctAnswer
                  const isWrongOption = hasUserAnswer && idx === userAnswer && idx !== correctAnswer
                  return (
                    <div key={idx} className={`review-option ${isCorrectOption ? 'correct-answer' : ''} ${isWrongOption ? 'wrong-answer' : ''}`}>
                      <span className="opt-label">{String.fromCharCode(65 + idx)}</span>
                      {opt}
                    </div>
                  )
                })}
              </div>
              <div style={{display:'flex', flexWrap:'wrap', gap:'8px 18px', marginTop:10, fontSize:12, opacity:0.9}}>
                <span><strong>Your answer:</strong> {hasUserAnswer ? `${answerLetter(userAnswer)}. ${q.options[userAnswer]}` : 'Not answered'}</span>
                <span><strong>Correct answer:</strong> {hasCorrectAnswer ? `${answerLetter(correctAnswer)}. ${q.options[correctAnswer]}` : 'Unavailable'}</span>
              </div>
              {q.explanation && (
                <div className="review-explanation" style={{marginTop:10, fontSize:13, opacity:0.9, padding:10, borderRadius:8}}>
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