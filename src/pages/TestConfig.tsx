import { useState, useMemo, useEffect, useRef } from 'react'
import { ArrowLeft, Clock, Timer, BookCheck, GraduationCap, Check, Grid3X3 } from 'lucide-react'
import type { TestConfigType } from '../types'
import './TestConfig.css'

type Props = {
  setActivePage: (page: string) => void
  testConfig: TestConfigType
  setTestConfig: (config: TestConfigType) => void
  selectedExam?: any
}

type SubjectLike = { subject?: string; name?: string; questions?: number; years?: string; required?: boolean; questionsByYear?: Record<string, number> } | string

const subjectName = (s: SubjectLike) => (typeof s === 'string' ? s : s?.subject || s?.name || '')
const hasYearAvailability = (subjects: SubjectLike[]) =>
  subjects.some(s => typeof s === 'object' && s?.questionsByYear && Object.keys(s.questionsByYear).length > 0)

export default function TestConfig({ setActivePage, testConfig, setTestConfig, selectedExam }: Props) {
  const [mode, setMode] = useState<'exam' | 'practice'>(testConfig.mode)
  const [difficulty, setDifficulty] = useState(testConfig.difficulty || 'General')
  const [topic, setTopic] = useState(testConfig.topic || 'All Topics')
  const [year, setYear] = useState<string>(testConfig.year || '')
  const [duration, setDuration] = useState<number>(testConfig.duration || 60)
  const [questionCount, setQuestionCount] = useState<number>(testConfig.questionCount || 0)
  const yearAdjustedRef = useRef<string>('')

  const allSubjects = (testConfig.subjects || []) as SubjectLike[]
  const availabilityKnown = hasYearAvailability(allSubjects)

  const availableYears = useMemo(() => {
    if (!availabilityKnown) return Array.from({ length: 16 }, (_, i) => `${2025 - i}`)
    const set = new Set<string>()
    for (const s of allSubjects) {
      if (typeof s !== 'object' || !s?.questionsByYear) continue
      for (const [y, c] of Object.entries(s.questionsByYear)) {
        if (Number(c) > 0) set.add(String(y))
      }
    }
    return Array.from(set).sort((a, b) => Number(b) - Number(a))
  }, [allSubjects, availabilityKnown])

  const effectiveYear = availableYears.length ? (availableYears.includes(year) ? year : availableYears[0]) : year

  const subjectsForYear = useMemo(() => {
    if (!availabilityKnown) {
      return allSubjects.map(s => {
        const name = subjectName(s)
        const base = typeof s === 'object' && s ? s : {}
        return {
          subject: name,
          questions: Number((base as any).questions) || 0,
          years: String((base as any).years || effectiveYear || '2024'),
          required: !!(base as any).required || name.toLowerCase().includes('english'),
          questionsByYear: (base as any).questionsByYear || {},
        }
      }).filter(s => s.subject)
    }
    return allSubjects.map(s => {
      const name = subjectName(s)
      const base = typeof s === 'object' && s ? s : {}
      const qby = (base as any).questionsByYear || {}
      const count = Number(qby[effectiveYear] || 0)
      return {
        subject: name,
        questions: count,
        years: effectiveYear,
        required: !!(base as any).required || name.toLowerCase().includes('english'),
        questionsByYear: qby,
      }
    }).filter(s => s.subject && s.questions > 0)
  }, [allSubjects, effectiveYear, availabilityKnown])

  const totalQuestions = subjectsForYear.reduce((sum, s) => sum + (s.questions || 0), 0)
  const recommendedDuration = Math.max(1, Math.ceil((totalQuestions || 0) * 1.2) || 60)

  const QUESTION_COUNT_OPTIONS = [15, 40, 50] as const
  const effectiveQuestionCount = questionCount || totalQuestions || 0
  const countExceedsBank = effectiveQuestionCount > 0 && totalQuestions > 0 && effectiveQuestionCount > totalQuestions
  const effectiveDuration = countExceedsBank ? recommendedDuration : duration

  useEffect(() => {
    if (effectiveYear !== year) setYear(effectiveYear)
  }, [effectiveYear, year])

  // When year (availability context) changes, auto-adjust duration to fit available questions.
  useEffect(() => {
    if (!availabilityKnown) return
    if (yearAdjustedRef.current === effectiveYear) return
    yearAdjustedRef.current = effectiveYear
    if (totalQuestions > 0) setDuration(recommendedDuration)
  }, [effectiveYear, availabilityKnown, totalQuestions, recommendedDuration])

  // Keep config in sync so downstream steps (instructions/test) use year-filtered subjects/counts.
  useEffect(() => {
    const nextYear = effectiveYear || year
    const subjectsChanged =
      subjectsForYear.length !== (testConfig.subjects || []).length ||
      subjectsForYear.some((s, i) => subjectName((testConfig.subjects || [])[i] as any) !== s.subject || Number(((testConfig.subjects || [])[i] as any)?.questions) !== s.questions)
    const shouldUpdate =
      subjectsChanged ||
      testConfig.year !== nextYear ||
      testConfig.totalQuestions !== totalQuestions ||
      testConfig.questionCount !== questionCount ||
      testConfig.duration !== effectiveDuration ||
      testConfig.mode !== mode ||
      testConfig.difficulty !== difficulty ||
      testConfig.topic !== topic ||
      testConfig.showAnswers !== (mode === 'practice')
    if (!shouldUpdate) return
    setTestConfig({
      ...testConfig,
      subjects: subjectsForYear,
      year: nextYear,
      totalQuestions,
      questionCount,
      duration: effectiveDuration,
      mode,
      difficulty,
      topic,
      showAnswers: mode === 'practice',
      examId: selectedExam?.id || testConfig.examId || testConfig.customExamId || '',
      examTitle: selectedExam?.title || testConfig.examTitle || testConfig.customTitle || '',
    })
  }, [subjectsForYear, effectiveYear, totalQuestions, questionCount, effectiveDuration, duration, mode, difficulty, topic, selectedExam, year])

  const timePerQuestion = useMemo(() => {
    const total = effectiveQuestionCount || totalQuestions
    if (!total) return 0
    return (effectiveDuration * 60 / total).toFixed(0)
  }, [effectiveDuration, effectiveQuestionCount, totalQuestions])

  const handleYearChange = (nextYear: string) => {
    yearAdjustedRef.current = ''
    setYear(nextYear)
  }

  const handleContinue = () => {
    if (!subjectsForYear.length || totalQuestions <= 0) return
    const finalConfig: TestConfigType = {
      ...testConfig,
      mode,
      duration: effectiveDuration,
      year: effectiveYear || year,
      difficulty,
      topic,
      showAnswers: mode === 'practice',
      examId: selectedExam?.id || testConfig.examId || testConfig.customExamId || '',
      examTitle: selectedExam?.title || testConfig.examTitle || testConfig.customTitle || '',
      subjects: subjectsForYear,
      totalQuestions,
      questionCount,
    }
    setTestConfig(finalConfig)
    setActivePage('testInstructions')
  }

  const selectedSubjectNames = subjectsForYear.map(s => s.subject).filter(Boolean)
  const noAvailable = availabilityKnown && (!availableYears.length || !subjectsForYear.length || totalQuestions <= 0)

  return (
    <div className="config-page">
      <div className="config-header">
        <button className="back-circle1" onClick={() => setActivePage('subjects')}><ArrowLeft size={18}/></button>
        <div><h1>Configure Test</h1><p>{testConfig.examType}{selectedSubjectNames.length ? ` • ${selectedSubjectNames.join(', ')}` : ''} • {effectiveQuestionCount || totalQuestions || 0} Questions{selectedExam?.title ? ` • ${selectedExam.title}` : ''}</p></div>
      </div>

      <div className="config-card highlight">
        <h3>Selected Subjects</h3>
        <div className="selected-subjects-list">
         {subjectsForYear.map((s: any) => {
           const name = subjectName(s)
           const qs = `${s.questions} Qs • ${effectiveYear || s.years || ''}`
           return (
            <div key={name} className="selected-subject-item">
              <span className="s-name">{name}</span>
              <span className="s-q">{qs}</span>
            </div>
           )
         })}
         {subjectsForYear.length === 0 && <div className="selected-subject-item"><span className="s-name">No subjects available for this year.</span></div>}
        </div>
        <div className="total-q"><span>Total</span><b>{totalQuestions} Qs • {effectiveDuration} mins • ~{timePerQuestion}s per Q</b></div>
        {availabilityKnown && <p style={{margin:'8px 0 0', fontSize:12, color:'#8f9091'}}>Subjects and question counts update automatically when you change the year.</p>}
        {countExceedsBank && <p style={{margin:'8px 0 0', fontSize:12, color:'var(--danger-text, #fca5a5)'}}>Only {totalQuestions} questions are available for the selected subjects. The timer has been adjusted to fit the available bank.</p>}
      </div>

      <div className="config-card">
        <h3><Grid3X3 size={14}/> Number of Questions</h3>
        <div className="count-options">
          {QUESTION_COUNT_OPTIONS.map(n => {
            const disabled = totalQuestions > 0 && n > totalQuestions
            return (
              <button key={n} className={`count-option ${questionCount === n ? 'active' : ''} ${disabled ? 'disabled' : ''}`} onClick={() => setQuestionCount(questionCount === n ? 0 : n)} disabled={disabled}>
                <div className="count-num">{n}</div>
                <div className="count-label">{n} Questions</div>
                {questionCount === n && <div className="count-check"><Check size={14}/></div>}
                {disabled && <div className="count-tag">Not enough</div>}
              </button>
            )
          })}
        </div>
        {countExceedsBank && <p style={{margin:'10px 0 0', fontSize:12, color:'var(--danger-text, #fca5a5)'}}>The selected subjects only have {totalQuestions} questions. Choose fewer questions or go back and select more subjects.</p>}
        <p style={{margin:'10px 0 0', fontSize:12, color:'#8f9091'}}>{questionCount ? `You will answer ${effectiveQuestionCount} questions.` : `All ${totalQuestions || 0} available questions will be used.`}</p>
      </div>

      <div className="config-card">
        <h3>Choose practise mode</h3>
        <div className="mode-options">
          <button className={`mode-option ${mode === 'exam' ? 'active' : ''}`} onClick={() => setMode('exam')}>
            <div className="mode-icon"><Timer size={18}/></div><div className="mode-text"><span>Exam Mode</span><p>Timed, graded like real exam</p></div><div className="radio">{mode === 'exam' && <div className="radio-inner"></div>}</div>
          </button>
          <button className={`mode-option ${mode === 'practice' ? 'active' : ''}`} onClick={() => setMode('practice')}>
            <div className="mode-icon"><BookCheck size={18}/></div><div className="mode-text"><span>Study Mode</span><p>See answers instantly</p></div><div className="radio">{mode === 'practice' && <div className="radio-inner"></div>}</div>
          </button>
        </div>
      </div>

      <div className="config-card">
        <h3><Clock size={14}/> Test duration</h3>
        <div className="duration-grid">
          {[30,45,60,90,120,180].map(d => (<button key={d} className={`dur-btn ${duration===d?'active':''}`} onClick={()=>setDuration(d)}>{d < 60 ? `${d}m` : `${d/60}h`}</button>))}
        </div>
        <select className="config-select" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
          <option value={30}>30 minutes</option><option value={45}>45 minutes</option><option value={60}>1 hour</option><option value={90}>1.5 hours</option><option value={120}>2 hours</option><option value={180}>3 hours</option>
        </select>
      </div>

      <div className="config-card">
        <h3 className="account-title"><GraduationCap size={16}/> Test Settings</h3>
        <div className="config-row"><label>Year</label><select className="config-select small" value={effectiveYear || ''} onChange={(e) => handleYearChange(e.target.value)} disabled={!availableYears.length}>{availableYears.map(y => <option key={y} value={y}>{y}</option>)}{!availableYears.length && <option value="">No years available</option>}</select></div>
        <div className="config-row"><label>Difficulty</label><select className="config-select small" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}><option value="General">General</option><option value="Easy">Easy</option><option value="Normal">Normal</option><option value="Hard">Hard</option></select></div>
        <div className="config-row"><label>Topic</label><select className="config-select small" value={topic} onChange={(e) => setTopic(e.target.value)}><option value="All Topics">All Topics</option><option value="Random">Random Mix</option></select></div>
      </div>

          {noAvailable && <div className="config-card" style={{borderColor:'var(--danger, #7f1d1d)', color:'var(--danger-text, #fca5a5)'}}>No questions are available for the selected subjects in any year. Go back and choose different subjects.</div>}
      <button className="continue-btn" onClick={handleContinue} disabled={noAvailable || !subjectsForYear.length || totalQuestions <= 0}><Check size={18}/> CONTINUE TO INSTRUCTIONS</button>
    </div>
  )
}
