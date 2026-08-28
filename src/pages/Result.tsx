type Props = { 
  setActivePage: (page: string) => void 
}

import './Result.css'

export default function Result({ setActivePage }: Props) {
  const saved = localStorage.getItem('lastTestResult')
  const result = saved ? JSON.parse(saved) : { score: 0, total: 10, answers: [] }
  const percentage = Math.round((result.score / result.total) * 100)

  const getGrade = (p: number) => {
    if (p >= 70) return 'A - Excellent'
    if (p >= 60) return 'B - Very Good'
    if (p >= 50) return 'C - Good'
    if (p >= 40) return 'D - Pass'
    return 'F - Fail'
  }

  return (
    <div className="result-page">
      <div className="result-header">
        <h1>Test Complete!</h1>
        <p>Here is your performance</p>
      </div>

      <div className="score-card">
        <div className="score-circle">
          <div className="score-percent">{percentage}%</div>
          <div className="score-text">{result.score} / {result.total}</div>
        </div>
        <div className="score-grade">{getGrade(percentage)}</div>
      </div>

      <div className="result-actions">
        <button className="btn-primary" onClick={() => setActivePage('testConfig')}>
          Retake Test
        </button>
        <button className="btn-secondary" onClick={() => setActivePage('home')}>
          Go to Home
        </button>
      </div>
    </div>
  )
}