import { useEffect, useState } from 'react'
import './Result.css'

type Props = {
  setActivePage: (page: string) => void
}

export default function Result({ setActivePage }: Props) {
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    const data = localStorage.getItem('lastTestResult')
    if (data) setResult(JSON.parse(data))
  }, [])

  if (!result) return <div className="result-page"><div className="loader"></div></div>

  const percentage = Math.round((result.score / result.total) * 100)
  const passed = percentage >= 50
  const wrong = result.total - result.score

  return (
    <div className="result-page">
      <div className="result-card">
        <div className={`result-badge ${passed? 'pass' : 'fail'}`}>
          <span>{passed? '✓ PASSED' : '✗ FAILED'}</span>
        </div>

        <h1>Congratulations!</h1>
        <p className="result-subtitle">Here is how you performed</p>

        <div className="score-circle-wrap">
          <div className="score-circle">
            <svg viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" className="circle-bg" />
              <circle cx="50" cy="50" r="45" className="circle-progress" strokeDasharray={`${percentage * 2.83} 283`} />
            </svg>
            <div className="score-text">
              <h2>{result.score}/{result.total}</h2>
              <p>{percentage}%</p>
            </div>
          </div>
        </div>

        <div className="result-stats">
          <div className="stat-card correct">
            <div className="stat-icon">✓</div>
            <div>
              <span>Correct</span>
              <strong>{result.score}</strong>
            </div>
          </div>
          <div className="stat-card wrong">
            <div className="stat-icon">✗</div>
            <div>
              <span>Wrong</span>
              <strong>{wrong}</strong>
            </div>
          </div>
          <div className="stat-card time">
            <div className="stat-icon">⏱</div>
            <div>
              <span>Time</span>
              <strong>{result.duration || '25m'}</strong>
            </div>
          </div>
        </div>

        <div className="result-actions">
          <button className="btn-primary" onClick={() => setActivePage('review')}>
            Review Answers
          </button>
          <button className="btn-secondary" onClick={() => setActivePage('testConfig')}>
            Retake Test
          </button>
          <button className="btn-ghost" onClick={() => setActivePage('home')}>
            Back to Home
          </button>
        </div>
      </div>
    </div>
  )
}