import { useEffect, useState, useCallback } from 'react'
import type { TestConfigType } from '../types'
import './TestPage.css'

type Props = { setActivePage: (page: string) => void; testConfig: TestConfigType }
type Question = { id: string; subject: string; question: string; options: string[]; answer: number; explanation?: string }

export default function Test({ setActivePage, testConfig }: Props) {
  const [startTime] = useState(() => Date.now())
  const [questions, setQuestions] = useState<Question[]>([])
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>([])
  const [timeLeft, setTimeLeft] = useState(testConfig.duration * 60 || 3600)
  const [showGrid, setShowGrid] = useState(false)
  const [showCalc, setShowCalc] = useState(false)
  const [calcInput, setCalcInput] = useState('0')
  const [loading, setLoading] = useState(true)

  const getSubjectName = (s: any) => typeof s === 'string'? s : s?.subject || s?.name || 'General'
  const subjectsList: string[] = (testConfig.subjects || []).map(getSubjectName)
  const examType = testConfig.examType || 'JAMB'
  const examTitle = testConfig.examTitle || testConfig.title || examType

  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true)
      let fetched: Question[] = []
      try {
        const cached = localStorage.getItem('current_questions')
        if (cached) {
          const data = JSON.parse(cached)
          fetched = data.map((d: any, i: number) => ({
            id: d.id || `q-${i}`,
            subject: d.subject || examType,
            question: d.question,
            options: Array.isArray(d.options)? d.options : [d.options.A, d.options.B, d.options.C, d.options.D],
            answer: typeof d.answer === 'number'? d.answer : ['A','B','C','D'].indexOf(d.answer || 'A'),
            explanation: d.explanation || ''
          }))
          localStorage.removeItem('current_questions')
        } else {
          const subjectsParam = subjectsList.join(',')
          const res = await fetch(`http://127.0.0.1:5000/api/questions?examType=${examType}&subjects=${subjectsParam}`)
          const data = await res.json()
          fetched = data.map((d: any) => ({
            id: d.id, subject: d.subject, question: d.question,
            options: Array.isArray(d.options)? d.options : Object.values(d.options),
            answer: typeof d.answer === 'string'? ['A','B','C','D'].indexOf(d.answer) : d.answer,
            explanation: d.explanation
          }))
        }
      } catch (e) { console.log(e) }

      if (fetched.length === 0) {
        const count = testConfig.totalQuestions || 10
        fetched = Array.from({ length: count }).map((_, i) => {
          const sub = subjectsList[i % subjectsList.length] || examType
          return { id: `mock-${i}`, subject: sub, question: `${sub}: Question ${i + 1} (Add real questions in Flask Admin)`, options: ['Option A','Option B','Option C','Option D'], answer: i % 4, explanation: 'Add in admin' }
        })
      }

      const shuffled = fetched.sort(() => 0.5 - Math.random()).slice(0, testConfig.totalQuestions || fetched.length)
      setQuestions(shuffled)
      setAnswers(Array(shuffled.length).fill(null))
      setLoading(false)
    }
    fetchQuestions()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const calculateDuration = useCallback(() => { const d = Date.now() - startTime; return `${Math.floor(d/60000)}m ${Math.floor((d%60000)/1000)}s` }, [startTime])

  const handleSubmit = useCallback(() => {
    if (!questions.length) return
    const score = answers.reduce<number>((a, ans, i) => ans === questions[i]?.answer? a + 1 : a, 0)
    const result = {
      id: Date.now(),
      title: `${examType} - ${subjectsList.join(', ')}`,
      examTitle: examTitle,
      subject: subjectsList[0],
      date: new Date().toISOString(),
      score,
      total: questions.length,
      duration: calculateDuration(),
      status: score >= questions.length*0.5? 'Passed':'Failed',
      mode: testConfig.mode,
      examType: examType,
      answers,
      correctAnswers: questions.map(q=>q.answer),
      questions
    }
    localStorage.setItem('lastTestResult', JSON.stringify(result))
    setActivePage('result')
  }, [answers, questions, setActivePage, calculateDuration, examType, subjectsList, examTitle, testConfig.mode])

  useEffect(() => { if(timeLeft<=0){handleSubmit(); return} const t=setInterval(()=>setTimeLeft(x=>x-1),1000); return()=>clearInterval(t)}, [timeLeft, handleSubmit])

  const formatTime = (s:number) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`

  if (loading) return <div className="test-page1" style={{color:'#fff',padding:20}}>Loading {examType} questions from Flask...</div>

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