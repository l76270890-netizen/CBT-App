import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import './Result.css'

type Props = {
  setActivePage: (page: string) => void
}

export default function Result({ setActivePage }: Props) {
  const [result, setResult] = useState<any>(null)
  const [saved, setSaved] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    const data = localStorage.getItem('lastTestResult')
    if (data) {
      const parsed = JSON.parse(data)
      setResult(parsed)

      // SAVE TO FLASK - ONLY ONCE
      const alreadySaved = sessionStorage.getItem('historySaved')
      if (!alreadySaved && user?.user_id) {
        saveToBackend(parsed)
        sessionStorage.setItem('historySaved', 'true')
      } else if (!alreadySaved) {
        // also save even if no user_id yet (fallback to localStorage user)
        try {
          const savedUser = JSON.parse(localStorage.getItem('cbt_user') || '{}')
          if (savedUser.user_id) {
            saveToBackend(parsed, savedUser)
            sessionStorage.setItem('historySaved', 'true')
          }
        } catch {}
      }
    }
  }, [user])

  const saveToBackend = async (res: any, overrideUser?: any) => {
    const currentUser = overrideUser || user
    const savedUser = currentUser || JSON.parse(localStorage.getItem('cbt_user') || '{}')

    try {
      await fetch('http://localhost:5000/api/save-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: savedUser.user_id,
          email: savedUser.email,
          title: res.examTitle || res.subject || 'Practice Test',
          score: res.score,
          total: res.total,
          duration: res.duration || '0m',
          status: (res.score / res.total) >= 0.5? 'Passed' : 'Failed',
          mode: res.mode || 'exam',
          examType: res.examType || 'GENERAL',
        })
      })
      setSaved(true)
    } catch (e: any) {
      console.log("Save error:", e.message)
    }
  }

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

        <h1>{passed? 'Congratulations!' : 'Keep Trying!'}</h1>
        <p className="result-subtitle">Here is how you performed {saved && '• Saved to History ✓'}</p>

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
            <div><span>Correct</span><strong>{result.score}</strong></div>
          </div>
          <div className="stat-card wrong">
            <div className="stat-icon">✗</div>
            <div><span>Wrong</span><strong>{wrong}</strong></div>
          </div>
          <div className="stat-card time">
            <div className="stat-icon">⏱</div>
            <div><span>Time</span><strong>{result.duration || '25m'}</strong></div>
          </div>
        </div>

        <div className="result-actions">
          <button className="btn-primary" onClick={() => setActivePage('review')}>Review Answers</button>
          <button className="btn-secondary" onClick={() => { sessionStorage.removeItem('historySaved'); setActivePage('testConfig') }}>Retake Test</button>
          <button className="btn-ghost" onClick={() => { sessionStorage.removeItem('historySaved'); setActivePage('home') }}>Back to Home</button>
        </div>
      </div>
    </div>
  )
}