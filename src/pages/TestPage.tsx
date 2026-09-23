import { useEffect, useState, useCallback } from 'react'
import type { TestConfigType } from '../types'
import './TestPage.css'
import { API_URL } from '../config'
import { questionsBank } from '../data/questionsBank'

type Props = { setActivePage: (page: string) => void; testConfig: TestConfigType }
type Question = { id: string; subject: string; question: string; options: string[]; answer: number; explanation?: string; topic?: string }

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
  const subjectsList: string[] = (testConfig.subjects || []).map(getSubjectName).filter(Boolean)
  const examType = testConfig.examType || 'JAMB'
  const titleVal = testConfig.examTitle || testConfig.title || examType
  const filterTopic = (testConfig as any).topic || null
  const singleSubject = (testConfig as any).subject || subjectsList[0] || 'General'
  const examId = (testConfig as any).examId || (testConfig as any).id || null

  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true)
      let fetched: Question[] = []

      // 1. Try localStorage (from admin)
      try {
        const cached = localStorage.getItem('current_questions')
        if (cached) {
          const data = JSON.parse(cached)
          fetched = data.map((d: any, i: number) => ({
            id: d.id || `q-${i}`,
            subject: d.subject || singleSubject,
            question: d.question,
            options: Array.isArray(d.options)? d.options : [d.options.A, d.options.B, d.options.C, d.options.D],
            answer: typeof d.answer === 'number'? d.answer : ['A','B','C','D'].indexOf(d.answer || 'A'),
            explanation: d.explanation || '',
            topic: d.topic || ''
          }))
          localStorage.removeItem('current_questions')
        }
      } catch {}

      // 2. FIXED: Try Backend API - COLLECT ALL SUBJECTS
      if (fetched.length === 0) {
        try {
          let allFetched: Question[] = []

          // If we have examId, fetch per subject for that exam
          if (examId) {
            for (const sub of subjectsList) {
              try {
                const res = await fetch(`${API_URL}/api/questions?examId=${examId}&subject=${encodeURIComponent(sub)}`)
                if (res.ok) {
                  const data = await res.json()
                  if (Array.isArray(data) && data.length > 0) {
                    const mapped = data.map((d: any) => ({
                      id: d.id,
                      subject: d.subject || sub,
                      question: d.question,
                      options: Array.isArray(d.options)? d.options : Object.values(d.options),
                      answer: typeof d.answer === 'string'? ['A','B','C','D'].indexOf(d.answer) : d.answer?? 0,
                      explanation: d.explanation || '',
                      topic: d.topic || ''
                    }))
                    allFetched = [...allFetched,...mapped]
                  }
                }
              } catch {}
            }
          } else {
            // No examId - fetch by examType + each subject
            for (const sub of subjectsList) {
              try {
                const url = `${API_URL}/api/questions?examType=${encodeURIComponent(examType)}&subjects=${encodeURIComponent(sub)}&topic=${filterTopic || ''}`
                const res = await fetch(url)
                if (res.ok) {
                  const data = await res.json()
                  if (Array.isArray(data) && data.length > 0) {
                    const mapped = data.map((d: any) => ({
                      id: d.id,
                      subject: d.subject || sub,
                      question: d.question,
                      options: Array.isArray(d.options)? d.options : Object.values(d.options),
                      answer: typeof d.answer === 'string'? ['A','B','C','D'].indexOf(d.answer) : d.answer?? 0,
                      explanation: d.explanation || '',
                      topic: d.topic || ''
                    }))
                    allFetched = [...allFetched,...mapped]
                  }
                }
              } catch {}
            }
          }

          // If backend returned comma-separated subjects in one call, try that too
          if (allFetched.length === 0 && subjectsList.length > 0) {
            try {
              const res = await fetch(`${API_URL}/api/questions?examType=${examType}&subjects=${encodeURIComponent(subjectsList.join(','))}`)
              if (res.ok) {
                const data = await res.json()
                if (Array.isArray(data) && data.length > 0) {
                  allFetched = data.map((d: any) => ({
                    id: d.id, subject: d.subject, question: d.question,
                    options: Array.isArray(d.options)? d.options : Object.values(d.options),
                    answer: typeof d.answer === 'string'? ['A','B','C','D'].indexOf(d.answer) : d.answer?? 0,
                    explanation: d.explanation || '',
                    topic: d.topic || ''
                  }))
                }
              }
            } catch {}
          }

          fetched = allFetched
          console.log(`✅ Backend collected: ${fetched.length} Qs from [${subjectsList.join(', ')}]`)
        } catch (e) { console.log("API failed, using local bank", e) }
      }

      // 3. Fallback to Local Bank - COLLECT ALL SUBJECTS
      if (fetched.length === 0) {
        let combined: Question[] = []
        if (subjectsList.length > 0) {
          for (const sub of subjectsList) {
            const bankKey = sub?.toLowerCase() || 'english'
            let bankQs = (questionsBank as any)[bankKey] || []
            if (filterTopic) {
              const filtered = bankQs.filter((q: any) => q.topic?.toLowerCase() === filterTopic.toLowerCase())
              if (filtered.length > 0) bankQs = filtered
            }
            const mapped = bankQs.map((q: any, i: number) => ({
              id: `${bankKey}-${i}`,
              subject: sub,
              question: q.question,
              options: q.options,
              answer: q.answer,
              explanation: q.explanation || '',
              topic: q.topic || ''
            }))
            combined = [...combined,...mapped]
          }
        }
        if (combined.length > 0) {
          fetched = combined
        } else {
          const bankKey = singleSubject?.toLowerCase() || 'english'
          let bankQs = (questionsBank as any)[bankKey] || (questionsBank as any)['english'] || []
          if (filterTopic) {
            const filtered = bankQs.filter((q: any) => q.topic?.toLowerCase() === filterTopic.toLowerCase())
            if (filtered.length > 0) bankQs = filtered
          }
          fetched = bankQs.map((q: any, i: number) => ({
            id: `${bankKey}-${i}`,
            subject: singleSubject,
            question: q.question,
            options: q.options,
            answer: q.answer,
            explanation: q.explanation || '',
            topic: q.topic || ''
          }))
        }
      }

      // 4. Final mock if everything empty
      if (fetched.length === 0) {
        const total = testConfig.totalQuestions || 40
        const perSubject = Math.ceil(total / (subjectsList.length || 1))
        fetched = subjectsList.flatMap((sub) =>
          Array.from({ length: perSubject }).map((_, i) => ({
            id: `mock-${sub}-${i}`,
            subject: sub,
            question: `${sub}: Question ${i + 1} - Add real questions in Admin Dashboard`,
            options: ['Option A','Option B','Option C','Option D'],
            answer: i % 4,
            explanation: 'Add questions in Admin dashboard'
          }))
        )
      }

      const shuffled = fetched.sort(() => 0.5 - Math.random()).slice(0, testConfig.totalQuestions || fetched.length)
      setQuestions(shuffled)
      setAnswers(Array(shuffled.length).fill(null))
      setLoading(false)
    }
    fetchQuestions()
  }, [])

  const calculateDuration = useCallback(() => { const d = Date.now() - startTime; return `${Math.floor(d/60000)}m ${Math.floor((d%60000)/1000)}s` }, [startTime])

  const handleSubmit = useCallback(() => {
    if (!questions.length) return
    const score = answers.reduce<number>((a, ans, i) => ans === questions[i]?.answer? a + 1 : a, 0)
    const result = {
      id: Date.now(),
      title: filterTopic? `${singleSubject} - ${filterTopic}` : `${examType} - ${subjectsList.join(', ')}`,
      examTitle: titleVal,
      subject: subjectsList.join(', '),
      subjects: subjectsList,
      date: new Date().toISOString(),
      score,
      total: questions.length,
      duration: calculateDuration(),
      status: score >= questions.length*0.5? 'Passed' : 'Failed',
      mode: testConfig.mode,
      examType: examType,
      answers,
      correctAnswers: questions.map(q=>q.answer),
      questions
    }
    localStorage.setItem('lastTestResult', JSON.stringify(result))
    setActivePage('result')
  }, [answers, questions, setActivePage, calculateDuration, examType, subjectsList, titleVal, testConfig.mode, filterTopic, singleSubject])

  useEffect(() => { if(timeLeft<=0){handleSubmit(); return} const t=setInterval(()=>setTimeLeft(x=>x-1),1000); return()=>clearInterval(t)}, [timeLeft, handleSubmit])
  const formatTime = (s:number) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`

  if (loading) return <div className="test-page1" style={{color:'#fff',padding:40,textAlign:'center'}}>Loading {subjectsList.join(', ') || singleSubject} questions...<br/>{subjectsList.length} subjects • Please wait</div>

  if (!questions.length) return <div className="test-page1" style={{color:'#fff',padding:40,textAlign:'center'}}>No questions found for {subjectsList.join(', ')}<br/><button onClick={()=>setActivePage('home')} style={{marginTop:12, padding:'8px 16px'}}>Go Home</button></div>

  const q = questions[current]
  const answeredCount = answers.filter(a=>a!==null).length

  return (
    <div className="test-page1">
      <div className="test-header">
        <button className="exit-btn" onClick={()=>{if(confirm('Exit?')) setActivePage(testConfig.fromStudy? 'study' : 'test-config')}}>✕</button>
        <div className="header-right"><button className="icon-btn" onClick={()=>setShowCalc(!showCalc)}>🧮</button><div className={`test-timer ${timeLeft<300?'warning':''}`}>⏱ {formatTime(timeLeft)}</div></div>
      </div>
      <div className="account"><div className="test-subject">{q.subject} {q.topic? `• ${q.topic}` : ''}</div><div className="test-q-count">Q {current+1}/{questions.length} • {answeredCount} Answered</div></div>
      <div className="test-body">
        <div className="question-card">
          <h2 className="question-text">{q.question}</h2>
          <div className="options">{q.options.map((opt,i)=><button key={i} className={`option-btn ${answers[current]===i?'selected':''}`} onClick={()=>{const c=[...answers]; c[current]=i; setAnswers(c)}}><span className="option-label">{String.fromCharCode(65+i)}</span><span>{opt}</span></button>)}</div>
          {testConfig.mode==='study' && answers[current]!==null && <div style={{marginTop:16, padding:12, background:'#1e1e1e', borderRadius:10, color: answers[current]===q.answer?'#10B981':'#EF4444'}}>{answers[current]===q.answer?'✓ Correct':`✗ Correct: ${String.fromCharCode(65+q.answer)}`} {q.explanation && ` - ${q.explanation}`}</div>}
        </div>
      </div>
      <div className="test-footer">
        <button className="nav-btn" disabled={current===0} onClick={()=>setCurrent(c=>c-1)}>← Previous</button>
        <button className="grid-btn" onClick={()=>setShowGrid(true)}><span>{current+1}/{questions.length}</span><div className="progress-bar1"><div style={{width:`${(answeredCount/questions.length)*100}%`}}></div></div></button>
        {current===questions.length-1? <button className="submit-btn" onClick={handleSubmit}>Submit</button> : <button className="nav-btn primary" onClick={()=>setCurrent(c=>c+1)}>Next →</button>}
      </div>
      {showGrid && <div className="grid-overlay" onClick={()=>setShowGrid(false)}><div className="grid-modal" onClick={e=>e.stopPropagation()}><h3>Questions - {subjectsList.join(', ')} {filterTopic? `(${filterTopic})` : ''}</h3><div className="question-grid">{questions.map((_,i)=><button key={i} className={`grid-item ${answers[i]!==null?'answered':''} ${current===i?'active':''}`} onClick={()=>{setCurrent(i); setShowGrid(false)}}>{i+1}<small style={{display:'block', fontSize:9}}>{questions[i].subject.slice(0,3)}</small></button>)}</div><button className="submit-btn full" onClick={handleSubmit}>Submit Test - {questions.length} Qs</button></div></div>}
      {showCalc && <div className="calc-overlay" onClick={()=>setShowCalc(false)}><div className="calc-modal" onClick={e=>e.stopPropagation()}><div className="calc-header"><h3>Calc</h3><button onClick={()=>setShowCalc(false)}>✕</button></div><div className="calc-display">{calcInput}</div><div className="calc-keys">{['C','⌫','/','*','7','8','9','-','4','5','6','+','1','2','3','=','0','.'].map(k=><button key={k} className={`calc-key ${k==='='?'equals':''}`} onClick={()=>{if(k==='C') setCalcInput('0'); else if(k==='⌫') setCalcInput(p=>p.length>1?p.slice(0,-1):'0'); else if(k==='='){try{setCalcInput(Function(`"use strict";return (${calcInput})`)().toString())}catch{setCalcInput('Error')}} else setCalcInput(p=>p==='0'?k:p+k)}}>{k}</button>)}</div></div></div>}
    </div>
  )
}