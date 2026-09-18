import { useState, useEffect, useCallback } from 'react'
import { db } from '../firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'
import type { TestConfigType } from '../types'
import './TestPage.css'

type Props = { setActivePage: (page: string) => void; testConfig: TestConfigType }
type Question = { id: string; subject: string; question: string; options: string[]; answer: number; explanation?: string }

export default function Test({ setActivePage, testConfig }: Props) {
  const [startTime] = useState(() => Date.now())
  const [questions, setQuestions] = useState<Question[]>([])
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>([])
  const [timeLeft, setTimeLeft] = useState(testConfig.duration * 60)
  const [showGrid, setShowGrid] = useState(false)
  const [showCalc, setShowCalc] = useState(false)
  const [calcInput, setCalcInput] = useState('0')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true)
      let fetched: Question[] = []
      try {
        for (const s of testConfig.subjects) {
          const q = query(collection(db, 'questions'), where('subject', '==', s.subject), where('examType', '==', testConfig.examType))
          const snap = await getDocs(q)
          snap.forEach(doc => {
            const d = doc.data() as any
            fetched.push({ id: doc.id, subject: d.subject, question: d.question, options: [d.options.A, d.options.B, d.options.C, d.options.D], answer: ['A','B','C','D'].indexOf(d.correctAnswer), explanation: d.explanation })
          })
        }
      } catch {}

      if (fetched.length === 0) {
        fetched = Array.from({ length: testConfig.totalQuestions }).map((_, i) => {
          const sub = testConfig.subjects[i % testConfig.subjects.length]?.subject || testConfig.examType
          return { id: `mock-${i}`, subject: sub, question: `${sub}: Question ${i+1} - What is correct? (MOCK DATA - Add real questions in Admin)`, options: ['Option A','Option B','Option C','Option D'], answer: i % 4, explanation: 'Add real questions in admin panel' }
        })
      }

      const shuffled = fetched.sort(() => 0.5 - Math.random()).slice(0, testConfig.totalQuestions)
      setQuestions(shuffled)
      setAnswers(Array(shuffled.length).fill(null))
      setLoading(false)
    }
    fetchQuestions()
  }, [testConfig])

  const calculateDuration = useCallback(() => { const d = Date.now() - startTime; return `${Math.floor(d/60000)}m ${Math.floor((d%60000)/1000)}s` }, [startTime])
  const handleSubmit = useCallback(() => {
    if (!questions.length) return
    const score = answers.reduce((a, ans, i) => ans === questions[i]?.answer? a+1 : a, 0)
    const result = { id: Date.now(), title: `${testConfig.examType} - ${testConfig.subjects.map(s=>s.subject).join(', ')}`, date: new Date().toISOString(), score, total: questions.length, duration: calculateDuration(), status: score >= questions.length*0.5? 'Passed':'Failed', mode: testConfig.mode, answers, correctAnswers: questions.map(q=>q.answer) }
    localStorage.setItem('lastTestResult', JSON.stringify(result))
    const h = JSON.parse(localStorage.getItem('practiceHistory') || '[]')
    localStorage.setItem('practiceHistory', JSON.stringify([result,...h]))
    setActivePage('result')
  }, [answers, questions, testConfig, setActivePage, calculateDuration])

  useEffect(() => { if(timeLeft<=0){handleSubmit(); return} const t=setInterval(()=>setTimeLeft(x=>x-1),1000); return()=>clearInterval(t)}, [timeLeft, handleSubmit])

  const formatTime = (s:number) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`

  if (loading) return <div className="test-page1" style={{color:'#fff',padding:20}}>Loading {testConfig.examType} questions...</div>

  const q = questions[current]
  const answeredCount = answers.filter(a=>a!==null).length

  return (
    <div className="test-page1">
      <div className="test-header">
        <button className="exit-btn" onClick={()=>{if(confirm('Exit?')) setActivePage('testConfig')}}>✕</button>
        <div className="header-right"><button className="icon-btn" onClick={()=>setShowCalc(!showCalc)}>🧮</button><div className={`test-timer ${timeLeft<300?'warning':''}`}>⏱ {formatTime(timeLeft)}</div></div>
      </div>
      <div className="account"><div className="test-subject">{q.subject}</div><div className="test-q-count">Q {current+1}/{questions.length} • {answeredCount} Answered</div></div>
      <div className="test-body">
        <div className="question-card">
          <h2 className="question-text">{q.question}</h2>
          <div className="options">{q.options.map((opt,i)=><button key={i} className={`option-btn ${answers[current]===i?'selected':''}`} onClick={()=>{const c=[...answers]; c[current]=i; setAnswers(c)}}><span className="option-label">{String.fromCharCode(65+i)}</span><span>{opt}</span></button>)}</div>
          {testConfig.mode==='practice' && answers[current]!==null && <div style={{marginTop:16, padding:12, background:'#1e1e1e', borderRadius:10, color: answers[current]===q.answer?'#10B981':'#EF4444'}}>{answers[current]===q.answer?'✓ Correct':`✗ Correct: ${String.fromCharCode(65+q.answer)}`} {q.explanation && ` - ${q.explanation}`}</div>}
        </div>
      </div>
      <div className="test-footer">
        <button className="nav-btn" disabled={current===0} onClick={()=>setCurrent(c=>c-1)}>← Previous</button>
        <button className="grid-btn" onClick={()=>setShowGrid(true)}><span>{current+1}/{questions.length}</span><div className="progress-bar1"><div style={{width:`${(answeredCount/questions.length)*100}%`}}></div></div></button>
        {current===questions.length-1? <button className="submit-btn" onClick={handleSubmit}>Submit</button> : <button className="nav-btn primary" onClick={()=>setCurrent(c=>c+1)}>Next →</button>}
      </div>
      {showGrid && <div className="grid-overlay" onClick={()=>setShowGrid(false)}><div className="grid-modal" onClick={e=>e.stopPropagation()}><h3>Jump</h3><div className="question-grid">{questions.map((_,i)=><button key={i} className={`grid-item ${answers[i]!==null?'answered':''} ${current===i?'active':''}`} onClick={()=>{setCurrent(i); setShowGrid(false)}}>{i+1}</button>)}</div><button className="submit-btn full" onClick={handleSubmit}>Submit</button></div></div>}
      {showCalc && <div className="calc-overlay" onClick={()=>setShowCalc(false)}><div className="calc-modal" onClick={e=>e.stopPropagation()}><div className="calc-header"><h3>Calc</h3><button onClick={()=>setShowCalc(false)}>✕</button></div><div className="calc-display">{calcInput}</div><div className="calc-keys">{['C','⌫','/','*','7','8','9','-','4','5','6','+','1','2','3','=','0','.'].map(k=><button key={k} className={`calc-key ${k==='='?'equals':''}`} onClick={()=>{if(k==='C') setCalcInput('0'); else if(k==='⌫') setCalcInput(p=>p.length>1?p.slice(0,-1):'0'); else if(k==='='){try{setCalcInput(Function(`"use strict";return (${calcInput})`)().toString())}catch{setCalcInput('Error')}} else setCalcInput(p=>p==='0'?k:p+k)}}>{k}</button>)}</div></div></div>}
    </div>
  )
}