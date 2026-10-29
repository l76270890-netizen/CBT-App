import { useState, useEffect } from 'react'
import './GeneralKnowledge.css'
import { apiRequest, asArray } from '../api'

export default function GeneralKnowledge({ setActivePage, setTestConfig, examId }: any) {
  const [questions, setQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    const load = async () => {
      try {
        if (!examId) {
          setQuestions([])
          setLoading(false)
          return
        }
        const query = new URLSearchParams({ examId: String(examId), subject: 'General Knowledge' })
        const payload = await apiRequest<unknown>(`/api/questions?${query}`)
        setQuestions(Array.isArray(payload) ? payload : asArray<any>((payload as any)?.questions))
      } catch(err) {
        console.error(err)
      }
      setLoading(false)
    }
    load()
  },[])

  const start = () => {
    if(questions.length === 0) return alert("No questions yet. Add them in Admin Dashboard.")
    // save questions to localStorage for TestPage to use
    localStorage.setItem('current_questions', JSON.stringify(questions))
    setTestConfig((prev:any)=>({...prev, examType: 'GENERAL', subjects: ['General Knowledge'], totalQuestions: questions.length, duration: 30 }))
    setActivePage('testInstructions')
  }

  return (
    <div className="home-container">
      <div className="home-header">
        <h1 className="home-title">General <span>Knowledge</span></h1>
        <p className="home-subtitle">Current affairs, history & general studies</p>
      </div>

      <div className="stats-grid1">
        <div className="stats-card"><h2>{questions.length}</h2><span>Questions Available</span></div>
        <div className="stats-card"><h2>30</h2><span>Minutes</span></div>
      </div>

      {loading? <div className="no-result">Loading questions...</div> : (
        <div className="exam-card1" onClick={start} style={{cursor:'pointer'}}>
          <div className="exam-info"><h4>Start General Knowledge Test</h4><p>{questions.length} questions • Click to begin</p></div>
          <span className="chevron">›</span>
        </div>
      )}

      <button onClick={()=>setActivePage('home')} className="hero-btn" style={{marginTop:20, background:'#1e1e1e', color:'#fff', border:'1px solid #2a2a2a'}}>← Back Home</button>
    </div>
  )
}
