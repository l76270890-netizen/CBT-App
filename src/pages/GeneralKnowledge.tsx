import { useState, useEffect } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import './GeneralKnowledge.css'

export default function GeneralKnowledge({ setActivePage, setTestConfig }: any) {
  const [questions, setQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    const load = async () => {
      const q = query(collection(db,"questions"), where("subject","==","General Knowledge"))
      const snap = await getDocs(q)
      setQuestions(snap.docs.map(d=>d.data()))
      setLoading(false)
    }
    load()
  },[])

  const start = () => {
    setTestConfig((prev:any)=>({...prev, examType: 'GENERAL', subjects: ['General Knowledge'], totalQuestions: questions.length || 20, duration: 30 }))
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

      {loading? <div className="no-result">Loading...</div> : (
        <div className="exam-card1" onClick={start} style={{cursor:'pointer'}}>
          <div className="exam-info"><h4>Start General Knowledge Test</h4><p>{questions.length} questions • Click to begin</p></div>
          <span className="chevron">›</span>
        </div>
      )}

      <button onClick={()=>setActivePage('home')} className="hero-btn" style={{marginTop:20, background:'#1e1e1e', color:'#fff', border:'1px solid #2a2a2a'}}>← Back Home</button>
    </div>
  )
}