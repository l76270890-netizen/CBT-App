import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { BarChart3, Trophy, Clock, Target, Trash2, RotateCcw, Award, Calendar } from 'lucide-react'
import './PracticeHistory.css'
import { apiRequest, asArray } from '../api'

type HistoryItem = { id: string; title: string; date: string; score: number; total: number; duration: string; status: string; mode?: string; subject?: string }

export default function PracticeHistory({ setActivePage }: any) {
  const { user } = useAuth()
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [filter, setFilter] = useState<'all'|'Passed'|'Failed'>('all')
  const [loading, setLoading] = useState(true)
  const [historyError, setHistoryError] = useState('')

  useEffect(() => {
    if(!user?.user_id) { setLoading(false); return }
    setLoading(true)
    setHistoryError('')
    apiRequest<unknown>(`/api/history/${encodeURIComponent(user.user_id)}`)
     .then(payload => {
        const data = asArray<HistoryItem>(payload)
        const onlyExams = data.filter(h => h.mode !== 'study').map(item => ({
          ...item,
          status: item.status === 'Passed' || item.status === 'Failed'
            ? item.status
            : (item.total > 0 && item.score / item.total >= 0.5 ? 'Passed' : 'Failed'),
        }))
        setHistory(onlyExams)
      })
     .catch(error => setHistoryError(error instanceof Error ? error.message : 'Could not load exam history.'))
     .finally(() => setLoading(false))
  }, [user])

  const filtered = useMemo(() => filter==='all'? history : history.filter(h=>h.status===filter), [history, filter])

  const summary = useMemo(() => {
    if(!history.length) return {avg:0,best:0,passed:0,total:0}
    const percents = history.map(h=>Math.round((h.score/h.total)*100))
    return { avg: Math.round(percents.reduce((a,b)=>a+b,0)/percents.length), best: Math.max(...percents), passed: history.filter(h=>h.status==='Passed').length, total: history.length }
  }, [history])

  const handleDelete = async (id: string) => {
    if(!confirm("Delete?")) return
    try {
      await apiRequest(`/api/history/${encodeURIComponent(id)}`, { method: 'DELETE' })
      setHistory(prev=>prev.filter(h=>h.id!==id))
    } catch (error) { setHistoryError(error instanceof Error ? error.message : 'Could not delete history.') }
  }

  const handleClear = async () => {
    if(!confirm("Clear all history? Only exams will be cleared. Study is never saved.")) return
    try {
      await apiRequest(`/api/history/clear/${encodeURIComponent(user.user_id)}`, { method: 'DELETE' })
      setHistory([])
    } catch (error) { setHistoryError(error instanceof Error ? error.message : 'Could not clear history.') }
  }

  if(loading) return <section className="history-section"><div className="history-container"><div className="history-header"><h1>History</h1></div><p>Loading exam history…</p></div></section>

  if(history.length===0) return (
    <section className="history-section">
      <div className="history-container">
        <div className="history-header"><h1>History</h1><p>Only exam tests are saved • Study practice is not saved</p></div>
        {historyError && <p role="alert">{historyError}</p>}
        <div className="empty-state"><BarChart3 size={32}/><h3>No exam history yet</h3><p style={{fontSize:13, color:'#888'}}>Study mode is practice and does not count</p><button onClick={()=>setActivePage('exams')} className="start-btn">Start Exam</button></div>
      </div>
    </section>
  )

  return (
    <section className="history-section"><div className="history-container">
      {historyError && <p role="alert">{historyError}</p>}
      <div className="history-header"><div><h1>History</h1><p>{summary.total} exams • {summary.passed} passed • Study hidden</p></div><button className="clear-all-btn" onClick={handleClear}><Trash2 size={14}/> Clear Exams</button></div>
      <div className="summary-grid">
        <div className="summary-card"><Target size={18} className="s-blue"/><div><h3>{summary.avg}%</h3><span>Avg</span></div></div>
        <div className="summary-card"><Trophy size={18} className="s-gold"/><div><h3>{summary.best}%</h3><span>Best</span></div></div>
        <div className="summary-card"><Award size={18} className="s-green"/><div><h3>{summary.passed}/{summary.total}</h3><span>Passed</span></div></div>
      </div>
      <div className="filter-tabs">{(['all','Passed','Failed'] as const).map(t=><button key={t} className={`filter-tab ${filter===t?'active':''}`} onClick={()=>setFilter(t)}>{t}</button>)}</div>
      <div className="history-grid">
        {filtered.map(item=>(
          <div key={item.id} className="history-card">
            <div className="card-top"><div><h3>{item.title}</h3><div className="card-meta"><span><Calendar size={12}/> {new Date(item.date).toLocaleDateString()}</span><span><Clock size={12}/> {item.duration}</span></div></div><span className={`status-badge ${item.status.toLowerCase()}`}>{item.status}</span></div>
            <div className="card-stats"><span>{item.score}/{item.total}</span><span>{Math.round((item.score/item.total)*100)}%</span></div>
            <div className="card-actions"><button className="retake-btn" onClick={()=>setActivePage('exams')}><RotateCcw size={14}/> Retake</button><button className="delete-btn" onClick={()=>handleDelete(item.id)}><Trash2 size={16}/></button></div>
          </div>
        ))}
      </div>
    </div></section>
  )
}
