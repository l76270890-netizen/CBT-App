type Props = {
  setActivePage: (page: string) => void
}

import { useEffect, useState } from 'react'
import './Result.css'

export default function Result({ setActivePage }: Props) {
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    const data = localStorage.getItem('lastTestResult')
    if (data) setResult(JSON.parse(data))
  }, [])

  if (!result) return <div className="result-page">Loading...</div>

  const handleReview = () => {
    setActivePage('review') // <-- just navigate to review page
  }

  const percentage = Math.round((result.score / result.total) * 100)
  const passed = percentage >= 50

  return (
    <div className="result-page">
      <div className="result-card">
        <div className={`result-badge ${passed? 'pass' : 'fail'}`}>
          {passed? 'PASSED' : 'FAILED'}
        </div>
        
        <h1>Your Score</h1>
        <div className="score-circle">
          <h2>{result.score}/{result.total}</h2>
          <p>{percentage}%</p>
        </div>

        <div className="result-stats">
          <div className="stat">
            <span>Correct</span>
            <strong style={{color: '#10B981'}}>{result.score}</strong>
          </div>
          <div className="stat">
            <span>Wrong</span>
            <strong style={{color: '#EF4444'}}>{result.total - result.score}</strong>
          </div>
        </div>

        <div className="result-actions">
          <button className="btn-primary" onClick={handleReview}>
            Review Answers
          </button>
          <button className="btn-secondary" onClick={() => setActivePage('testConfig')}>
            Retake Test
          </button>
          <button className="btn-ghost" onClick={() => setActivePage('home')}>
            Go Home
          </button>
        </div>
      </div>
    </div>
  )
}