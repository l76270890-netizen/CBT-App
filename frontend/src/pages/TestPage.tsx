import { useEffect, useState, useCallback, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'
import type { TestConfigType } from '../types'
import './TestPage.css'
import { API_URL } from '../config'
import { apiRequest } from '../api'
import QuestionImage from '../components/QuestionImage'
import { loadCachedQuestions, syncAllQuestions } from '../offline/questions'
import { getAllQuestions } from '../offline/indexedDB'
import { saveOfflineAttempt, saveDraft, loadDraft, clearDraft, saveExamResult } from '../offline/attempts'
import { syncPendingAttempts } from '../offline/sync'
import { queueStudyActivity } from '../offline/study'
import { toAnswerIndex } from '../answerUtils'

type Props = { setActivePage: (page: string) => void; testConfig: TestConfigType }
type Question = { id: string; subject: string; question: string; imageUrl?: string; options: string[]; answer: number; explanation?: string; topic?: string }

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
  const [explanationVisible, setExplanationVisible] = useState<boolean[]>([])
  const [countWarning, setCountWarning] = useState<string | null>(null)
  const submitting = useRef(false)

  const getSubjectName = (s: any) => typeof s === 'string'? s : s?.subject || s?.name || 'General'
  const subjectsList: string[] = (testConfig.subjects || []).map(getSubjectName).filter(Boolean)
  const examType = testConfig.examType || 'JAMB'
  const titleVal = testConfig.examTitle || testConfig.title || examType
  const filterTopic = (testConfig as any).topic || null
  const singleSubject = (testConfig as any).subject || subjectsList[0] || 'General'
  const examId = (testConfig as any).examId || (testConfig as any).customExamId || (testConfig as any).id || null
  const draftKey = `cbt-draft:${examId || 'custom'}:${subjectsList.join('|')}:${testConfig.year || ''}`

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
            imageUrl: d.imageUrl || d.image_url || undefined,
            options: Array.isArray(d.options)? d.options : [d.options.A, d.options.B, d.options.C, d.options.D],
            answer: toAnswerIndex(d.answer ?? d.correctAnswer),
            explanation: d.explanation || '',
            topic: d.topic || ''
          }))
          localStorage.removeItem('current_questions')
        }
      } catch {}

      // 1. Load questions from localIndexedDB (transaction-safe helper)
      let fetchedFromIdx: Question[] = []
      const idxQuestions = await getAllQuestions()
      for (const q of idxQuestions) {
        if (!q || (!q.id && q.subject === singleSubject)) continue
        fetchedFromIdx.push({
          id: q.id,
          subject: q.subject,
          question: q.question,
          imageUrl: q.imageUrl || (q as any).image_url || undefined,
          options: Array.isArray(q.options) ? q.options : [(q as any).options?.A, (q as any).options?.B, (q as any).options?.C, (q as any).options?.D, (q as any).options?.E].filter(Boolean) as string[],
          answer: toAnswerIndex(q.answer ?? (q as any).correctAnswer),
          explanation: q.explanation || '',
          topic: q.topic || ''
        })
      }
      fetched = [...fetchedFromIdx, ...fetched]

      // 2. Try the backend only when we have the exam ID and a subject.
      if (fetched.length === 0 && examId && subjectsList.length > 0) {
        let allFetched: Question[] = []
        try {
          for (const sub of subjectsList) {
            try {
              const query = new URLSearchParams({ examId: String(examId), subject: sub })
              if (testConfig.year && testConfig.year !== 'All Years' && testConfig.year !== 'All') query.set('year', String(testConfig.year))
              const res = await fetch(`${API_URL}/api/questions?${query}`, { credentials: 'include' })
              if (res.ok) {
                const payload = await res.json()
                const data = Array.isArray(payload) ? payload : Array.isArray((payload as any)?.questions) ? (payload as any).questions : []
                if (data.length > 0) {
                  const mapped = data.map((d: any) => ({
                    id: d.id,
                    subject: d.subject || sub,
                    question: d.question,
                    imageUrl: d.imageUrl || d.image_url || undefined,
                    options: Array.isArray(d.options)? d.options : Object.values(d.options || {}),
                    answer: toAnswerIndex(d.answer ?? d.correctAnswer),
                    explanation: d.explanation || '',
                    topic: d.topic || ''
                  })).filter((d: any) => d.question && Array.isArray(d.options) && d.options.length > 0)
                  allFetched = [...allFetched,...mapped]
                }
              }
            } catch {}
          }
        } catch {}
        fetched = allFetched
      }

      // Sync locally when online
      if (navigator.onLine) {
        await syncAllQuestions(testConfig)
      }

      if (fetched.length === 0 && examId) {
        try {
          const cached = await loadCachedQuestions(String(examId), subjectsList, String(testConfig.year || ''))
          fetched = cached.map((d) => ({
            id: String(d.id),
            subject: d.subject,
            question: d.question,
            imageUrl: d.imageUrl,
            options: d.options,
            answer: toAnswerIndex(d.answer),
            explanation: d.explanation || '',
            topic: d.topic || ''
          })).filter((d) => d.question && Array.isArray(d.options) && d.options.length > 0)
        } catch (error) {
          console.warn('Could not load offline questions', error)
        }
      }

      if (fetched.length === 0) {
        fetched = []
      }

      const shuffled = fetched.sort(() => 0.5 - Math.random()).slice(0, testConfig.totalQuestions || fetched.length)
      const requestedCount = testConfig.questionCount || testConfig.totalQuestions || fetched.length
      const finalQuestions = requestedCount > 0 && requestedCount < shuffled.length
        ? shuffled.slice(0, requestedCount)
        : shuffled
      if (requestedCount > 0 && fetched.length < requestedCount) {
        setCountWarning(`Only ${fetched.length} of the requested ${requestedCount} questions were found. The test was built from the available question bank.`)
      } else {
        setCountWarning(null)
      }
      const draft = await loadDraft(draftKey).catch(() => null)
      setQuestions(finalQuestions)
      setAnswers(draft ? finalQuestions.map((question) => draft.answers[String(question.id)] ?? null) : Array(finalQuestions.length).fill(null))
      if (draft) {
        setCurrent(Math.min(Math.max(0, draft.current || 0), Math.max(0, finalQuestions.length - 1)))
        if (draft.timeLeft > 0) setTimeLeft(draft.timeLeft)
      }
      setExplanationVisible(Array(finalQuestions.length).fill(false))
      setLoading(false)
    };

    fetchQuestions();

    return () => {
      // cleanup interval on unmount
    };
  }, [answers, current, timeLeft, questions, loading, draftKey, examId, filterTopic, singleSubject, subjectsList, titleVal, testConfig.mode, testConfig.fromStudy, timeLeft, draftKey])

  const calculateDuration = useCallback(() => { const d = Date.now() - startTime; return `${Math.floor(d/60000)}m ${Math.floor((d%60000)/1000)}s` }, [startTime])

  const handleSubmit = useCallback(async () => {
    if (!questions.length || submitting.current) return
    submitting.current = true
    const score = answers.reduce<number>((a, ans, i) => ans === questions[i]?.answer? a + 1 : a, 0)
    const result = {
      id: Date.now(),
      clientAttemptId: '',
      title: filterTopic ? `${singleSubject} - ${filterTopic}` : `${examType} - ${subjectsList.join(', ')}`,
      examTitle: titleVal,
      examId: examId ? String(examId) : '',
      subject: subjectsList.join(', '),
      subjects: subjectsList,
      date: new Date().toISOString(),
      score,
      total: questions.length,
      duration: calculateDuration(),
      status: score >= questions.length*0.5 ? 'Passed' : 'Failed',
      mode: testConfig.mode,
      examType: examType,
      answers,
      correctAnswers: questions.map(q=>q.answer),
      questions,
      fromStudy: !!testConfig.fromStudy
    }
    result.clientAttemptId = `cbt-${result.id}`
    if (!testConfig.fromStudy) {
      try { await saveOfflineAttempt(result) } catch (error) { console.warn('Could not save offline attempt', error) }
    } else {
      try {
        await queueStudyActivity({
          clientActivityId: `study-${result.id}`,
          examType,
          subject: singleSubject,
          topic: filterTopic || undefined,
          year: testConfig.year,
          score: result.score,
          total: result.total,
          duration: result.duration,
          completedAt: result.date,
        })
      } catch (error) { console.warn('Could not save study activity', error) }
    }
    await saveExamResult(result)
    localStorage.setItem('lastTestResult', JSON.stringify(result))
    await clearDraft(draftKey).catch(() => {})
    // Novel CBT practice: save offline and sync later (dedupe via clientAttemptId)
    try {
      const novelCtx = localStorage.getItem('current_novel_practice')
      if (novelCtx) {
        const ctx = JSON.parse(novelCtx)
        const attempt = { clientAttemptId: `novel-${ctx.novelId || 'x'}-${result.id}`, novelId: ctx.novelId, score: result.score, total: result.total, answers: result.answers, completedAt: result.date }
        const key = 'novel_pending_attempts'
        const pending = JSON.parse(localStorage.getItem(key) || '[]')
        if (!pending.find((p:any)=>p.clientAttemptId===attempt.clientAttemptId)) { pending.push(attempt); localStorage.setItem(key, JSON.stringify(pending)) }
        try { await apiRequest('/api/novels/attempts/sync', { method: 'POST', body: JSON.stringify({ attempts: [attempt] }) }); const left = (JSON.parse(localStorage.getItem(key)||'[]') as any[]).filter((p:any)=>p.clientAttemptId!==attempt.clientAttemptId); localStorage.setItem(key, JSON.stringify(left)) } catch {}
        localStorage.removeItem('current_novel_practice')
      }
    } catch {}
    if (examId && testConfig.mode === 'exam') {
      const subjectsToRecord = [...new Set(questions.map(question => question.subject).filter(Boolean))]
      try {
        await Promise.all(subjectsToRecord.map(subject => {
          const subjectQuestions = questions.filter(question => question.subject === subject)
          const subjectScore = subjectQuestions.reduce((count, question) => {
            const index = questions.indexOf(question)
            return count + (answers[index] === question.answer ? 1 : 0)
          }, 0)
          return apiRequest('/api/attempts', {
            method: 'POST',
            body: JSON.stringify({ examId, subject, score: subjectScore, total: subjectQuestions.length, clientAttemptId: `${result.clientAttemptId}:${subject}` })
          })
        }))
      } catch (error) {
        console.error('Could not save school exam attempts:', error)
      }
    }
    if (navigator.onLine) await syncPendingAttempts()
    setActivePage('result')

  }, [answers, current, timeLeft, questions, loading, draftKey, draftKey, examId, filterTopic, singleSubject, subjectsList, titleVal, testConfig.mode, testConfig.fromStudy, timeLeft, draftKey])

  const formatTime = (s:number) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`

  if (loading) return <div className="test-page1" style={{padding:40,textAlign:'center'}}>Loading {subjectsList.join(', ') || singleSubject} questions...<br/>{subjectsList.length} subjects • Please wait</div>

  if (!questions.length) return <div className="test-page1" style={{padding:40,textAlign:'center'}}>{countWarning || `No questions found for ${subjectsList.join(',')}`}<br/><button onClick={()=>setActivePage('home')} style={{marginTop:12, padding:'8px 16px'}}>Go Home</button></div>

  const q = questions[current]
  const answeredCount = answers.filter(a=>a!==null).length
  // In Study/practice mode allow the student to reveal the answer and explanation on demand
  const studyMode = testConfig.mode === 'practice' || (!!testConfig.fromStudy && testConfig.mode !== 'exam')
  const revealed = studyMode && !!explanationVisible[current]
  const selectedAnswer = answers[current]
  const letters = ['A','B','C','D']
  const correctLetter = letters[q.answer] || 'A'
  const correctText = q.options[q.answer] ?? ''
  const explanationText = (q.explanation || '').trim() || 'No explanation available for this question.'

  const toggleExplanation = () => {
    setExplanationVisible(prev => {
      const next = [...prev]
      next[current] = !next[current]
      return next
    })
  }

  return (
    <div className="test-page1">
      <div className="test-header">
        <button className="exit-btn" onClick={()=>{if(confirm('Exit?')) setActivePage(testConfig.fromStudy? 'study' : 'test-config')}}>✕</button>
        <div className="header-right"><button className="icon-btn" onClick={()=>setShowCalc(!showCalc)}>🧮</button><div className={`test-timer ${timeLeft<300?'warning':''}`}>⏱ {formatTime(timeLeft)}</div></div>
      </div>
      {countWarning && <div className="count-warning-banner"><AlertTriangle size={14}/>{countWarning}</div>}
      <div className="account"><div className="test-subject">{q.subject} {q.topic? `• ${q.topic}` : ''}</div><div className="test-q-count">Q {current+1}/{questions.length} • {answeredCount} Answered</div></div>
      <div className="test-body">
        <div className="question-card">
          <h2 className="question-text">{q.question}</h2>
          {q.imageUrl && <QuestionImage key={q.imageUrl} className="question-diagram" imageUrl={q.imageUrl} />}
          <div className="options">{q.options.map((opt,i)=><button key={i} className={`option-btn ${selectedAnswer===i?'selected':''}`} onClick={()=>{if(studyMode && selectedAnswer!==null) return; const c=[...answers]; c[current]=i; setAnswers(c)}} disabled={studyMode && selectedAnswer!==null}><span className="option-label">{letters[i]}</span><span>{opt}</span></button>)}</div>

          {studyMode && (
            <div className="study-answer-controls">
              <button type="button" className="study-reveal-btn" onClick={toggleExplanation} disabled={selectedAnswer===null}>
                {revealed ? 'Hide Answer & Explanation' : 'Show Answer & Explanation'}
              </button>
              {selectedAnswer===null && <p className="study-reveal-hint">Select an answer to reveal the correct answer and explanation.</p>}
              <div className={`explanation-panel ${revealed ? 'open' : ''}`} aria-hidden={!revealed}>
                <div className="explanation-panel-inner">
                  {selectedAnswer!==null && (
                    <>
                      <div className={`answer-status ${selectedAnswer===q.answer ? 'correct' : 'wrong'}`}>
                        {selectedAnswer===q.answer ? '✓ Correct' : '✗ Incorrect'}
                      </div>
                      <div className="correct-answer-line"><strong>Correct Answer:</strong> {correctLetter}. {correctText}</div>
                      <div className="explanation-label">Explanation</div>
                      <p className="explanation-text">{explanationText}</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
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