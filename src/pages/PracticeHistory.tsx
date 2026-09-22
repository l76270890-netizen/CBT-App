import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { BarChart3, Trophy, Clock, Target, Trash2, RotateCcw, Award, Calendar } from 'lucide-react'
import './PracticeHistory.css'

type HistoryItem = { id: string; title: string; date: string; score: number; total: number; duration: string; status: 'Passed'|'Failed'; mode?: string }

export default function PracticeHistory({ setActivePage }: any) {
  const { user } = useAuth()
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [filter, setFilter] = useState<'all'|'Passed'|'Failed'>('all')

  useEffect(() => {
    if(!user?.user_id) return
    fetch(`http://127.0.0.1:5000/api/history/${user.user_id}`).then(r=>r.json()).then(setHistory).catch(()=>{})
  }, [user])

  const filtered = useMemo(() => filter==='all'? history : history.filter(h=>h.status===filter), [history, filter])
  const summary = useMemo(() => {
    if(!history.length) return {avg:0,best:0,passed:0,total:0}
    const percents = history.map(h=>Math.round((h.score/h.total)*100))
    return { avg: Math.round(percents.reduce((a,b)=>a+b,0)/percents.length), best: Math.max(...percents), passed: history.filter(h=>h.status==='Passed').length, total: history.length }
  }, [history])

  const handleDelete = async (id: string) => {
    if(!confirm("Delete?")) return
    await fetch(`http://127.0.0.1:5000/api/history/${id}`, { method: 'DELETE' })
    setHistory(prev=>prev.filter(h=>h.id!==id))
  }
  const handleClear = async () => {
    if(!confirm("Clear all?")) return
    await fetch(`http://127.0.0.1:5000/api/history/clear/${user.user_id}`, { method: 'DELETE' })
    setHistory([])
  }

  if(history.length===0) return (
    <section className="history-section"><div className="history-container"><div className="history-header"><h1>History</h1><p>Flask DB - No tests yet</p></div><div className="empty-state"><BarChart3 size={32}/><h3>No tests yet</h3><button onClick={()=>setActivePage('exams')} className="start-btn">Start Practice</button></div></div></section>
  )

  return (
    <section className="history-section"><div className="history-container">
      <div className="history-header"><div><h1>History</h1><p>{summary.total} tests • {summary.passed} passed • Flask</p></div><button className="clear-all-btn" onClick={handleClear}><Trash2 size={14}/> Clear</button></div>
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