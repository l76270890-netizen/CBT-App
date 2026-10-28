import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import './Result.css'
import { apiRequest } from '../api'

type Props = { setActivePage: (page: string) => void }

export default function Result({ setActivePage }: Props) {
  const [result, setResult] = useState<any>(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const savingKey = useRef<string | null>(null)
  const { user } = useAuth()

  const saveToBackend = async (res: any, key: string) => {
    if (savingKey.current === key) return
    savingKey.current = key
    setSaving(true)
    setSaveError('')
    try {
      await apiRequest('/api/save-result', {
        method: 'POST',
        body: JSON.stringify({
          title: res.examTitle || res.title || res.subject || 'Exam',
          score: res.score,
          total: res.total,
          duration: res.duration || '0m',
          status: (res.score / res.total) >= 0.5 ? 'Passed' : 'Failed',
          mode: res.mode || 'exam',
          examType: res.examType || 'GENERAL',
        })
      })
      sessionStorage.setItem(key, 'true')
      setSaved(true)
    } catch (error: unknown) {
      setSaveError(error instanceof Error ? error.message : 'Could not save this exam. Please retry.')
      savingKey.current = null
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    const data = localStorage.getItem('lastTestResult')
    if (!data) return
    try {
      const parsed = JSON.parse(data)
      setResult(parsed)
      if (parsed.mode === 'study') return
      if (!user?.user_id) {
        setSaveError('Sign in again to save this exam to your history.')
        return
      }
      const key = `historySaved:${user.user_id}:${parsed.id}`
      if (sessionStorage.getItem(key)) { setSaved(true); return }
      void saveToBackend(parsed, key)
    } catch {
      setSaveError('This exam result could not be read. Please retake the exam to save it.')
    }
  }, [user?.user_id])

  if (!result) return <div className="result-page"><div className="loader"></div></div>
  const percentage = Math.round((result.score / result.total) * 100)
  const passed = percentage >= 50
  const wrong = result.total - result.score

  return (
    <div className="result-page">
      <div className="result-card">
        <div className={`result-badge ${passed? 'pass' : 'fail'}`}><span>{passed? '✓ PASSED' : '✗ FAILED'}</span></div>
        <h1>{passed? 'Congratulations!' : 'Keep Trying!'}</h1>
        <p className="result-subtitle">Here is how you performed {saved ? '• Saved to History ✓' : saving ? '• Saving to History…' : ''}</p>
        {saveError && <p role="alert" className="result-subtitle">History save failed: {saveError} <button className="btn-ghost" onClick={() => user?.user_id && result && void saveToBackend(result, `historySaved:${user.user_id}:${result.id}`)}>Retry</button></p>}
        <div className="score-circle-wrap">
          <div className="score-circle">
            <svg viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" className="circle-bg" />
              <circle cx="50" cy="50" r="45" className="circle-progress" strokeDasharray={`${percentage * 2.83} 283`} />
            </svg>
            <div className="score-text"><h2>{result.score}/{result.total}</h2><p>{percentage}%</p></div>
          </div>
        </div>
        <div className="result-stats">
          <div className="stat-card correct"><div className="stat-icon">✓</div><div><span>Correct</span><strong>{result.score}</strong></div></div>
          <div className="stat-card wrong"><div className="stat-icon">✗</div><div><span>Wrong</span><strong>{wrong}</strong></div></div>
          <div className="stat-card time"><div className="stat-icon">⏱</div><div><span>Time</span><strong>{result.duration || '25m'}</strong></div></div>
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
