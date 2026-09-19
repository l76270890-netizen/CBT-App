import { useState, useEffect, useMemo } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, writeBatch, Timestamp } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { BarChart3, Trophy, Clock, Target, Trash2, RotateCcw, Award, Calendar } from 'lucide-react'
import './PracticeHistory.css'

type HistoryItem = {
  id: string
  title: string
  date: string
  score: number
  total: number
  duration: string
  status: 'Passed' | 'Failed'
  mode?: string
  examType?: string
  createdAt?: any
}

interface Props {
  setActivePage: (page: string) => void
  onRetake?: (id: string) => void
}

export default function PracticeHistory({ setActivePage, onRetake }: Props) {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [filter, setFilter] = useState<'all' | 'Passed' | 'Failed'>('all')
  const [uid, setUid] = useState<string | null>(null)

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      if (user) setUid(user.uid)
      else { setUid(null); setHistory([]) }
    })
  }, [])

  useEffect(() => {
    if (!uid) return
    const q = query(collection(db, `users/${uid}/history`), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as HistoryItem))
      setHistory(data)
    })
    return () => unsub()
  }, [uid])

  const filtered = useMemo(() => filter === 'all'? history : history.filter(h => h.status === filter), [history, filter])

  const summary = useMemo(() => {
    if (!history.length) return { avg: 0, best: 0, passed: 0, total: 0 }
    const percents = history.map(h => Math.round((h.score / h.total) * 100))
    return {
      avg: Math.round(percents.reduce((a, b) => a + b, 0) / percents.length),
      best: Math.max(...percents),
      passed: history.filter(h => h.status === 'Passed').length,
      total: history.length
    }
  }, [history])

  const getPercentage = (s: number, t: number) => Math.round((s / t) * 100)
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const handleDelete = async (id: string) => {
    if (!uid) return
    if (!confirm("Delete?")) return
    await deleteDoc(doc(db, `users/${uid}/history/${id}`))
  }

  const handleClear = async () => {
    if (!uid ||!confirm("Clear all history?")) return
    const batch = writeBatch(db)
    history.forEach(h => batch.delete(doc(db, `users/${uid}/history/${h.id}`)))
    await batch.commit()
  }

  const handleRetake = (item: HistoryItem) => {
    if (onRetake) onRetake(item.id as any)
    else setActivePage('exams')
  }

  if (history.length === 0) {
    return (
      <section className="history-section">
        <div className="history-container">
          <div className="history-header"><h1>Practice History</h1><p>Track your progress and keep improving</p></div>
          <div className="empty-state">
            <div className="empty-icon-wrap"><BarChart3 size={32} /></div>
            <h3>No tests yet</h3>
            <p>Complete your first test to see your stats here</p>
            <button onClick={() => setActivePage('exams')} className="start-btn">Start Practice</button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="history-section">
      <div className="history-container">
        <div className="history-header">
          <div><h1>Practice History</h1><p>{summary.total} tests • {summary.passed} passed</p></div>
          <button className="clear-all-btn" onClick={handleClear}><Trash2 size={14}/> Clear</button>
        </div>
        <div className="summary-grid">
          <div className="summary-card"><Target size={18} className="s-blue"/><div><h3>{summary.avg}%</h3><span>Avg Score</span></div></div>
          <div className="summary-card"><Trophy size={18} className="s-gold"/><div><h3>{summary.best}%</h3><span>Best Score</span></div></div>
          <div className="summary-card"><Award size={18} className="s-green"/><div><h3>{summary.passed}/{summary.total}</h3><span>Passed</span></div></div>
        </div>
        <div className="filter-tabs">
          {(['all','Passed','Failed'] as const).map(t => (
            <button key={t} className={`filter-tab ${filter===t?'active':''}`} onClick={()=>setFilter(t)}>{t==='all'?'All':t}</button>
          ))}
        </div>
        <div className="history-grid">
          {filtered.map((item) => {
            const percent = getPercentage(item.score, item.total)
            return (
              <div key={item.id} className="history-card">
                <div className="card-top">
                  <div className="card-title-wrap">
                    <h3>{item.title}</h3>
                    <div className="card-meta"><span><Calendar size={12}/> {formatDate(item.date)}</span><span><Clock size={12}/> {item.duration}</span></div>
                    {item.mode && <span className="mode-tag">{item.mode}</span>}
                  </div>
                  <span className={`status-badge ${item.status.toLowerCase()}`}>{item.status}</span>
                </div>
                <div className="card-stats">
                  <div className="stat-item"><span className="stat-label">Score</span><span className="stat-value">{item.score}/{item.total}</span></div>
                  <div className="stat-item"><span className="stat-label">Accuracy</span><span className="stat-value highlight">{percent}%</span></div>
                  <div className="stat-item"><span className="stat-label">Time</span><span className="stat-value">{item.duration}</span></div>
                </div>
                <div className="progress-bar"><div className="progress-fill" style={{width: `${percent}%`, background: percent >= 50? '#22C55E' : '#EF4444'}}></div></div>
                <div className="card-actions">
                  <button className="retake-btn" onClick={() => handleRetake(item)}><RotateCcw size={14}/> Retake</button>
                  <button className="delete-btn" onClick={()=>handleDelete(item.id)}><Trash2 size={16}/></button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}