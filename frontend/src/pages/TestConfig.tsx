import { useState, useMemo, useEffect, useRef } from 'react'
import { ArrowLeft, Clock, Timer, BookCheck, GraduationCap, Check } from 'lucide-react'
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
  const yearAdjustedRef = useRef<string>('')

  const allSubjects = (testConfig.subjects || []) as SubjectLike[]
  const availabilityKnown = hasYearAvailability(allSubjects)
  const isJambFlow = !!(testConfig.jambFlow || (String(testConfig.examType || '').toUpperCase() === 'JAMB' && (testConfig as any).jambLockedSelection))
  const lockedSubject = isJambFlow ? (subjectName((testConfig.subjects?.[0] || '') as SubjectLike) || (testConfig as any).subject || (testConfig as any).selectedSubject || '') : ''
  const lockedYearLabel = isJambFlow ? ((testConfig as any).yearRangeLabel || (typeof testConfig.subjects?.[0] === 'object' ? String((testConfig.subjects?.[0] as any)?.years || '') : '') || String(testConfig.year || '').split(',').join('\u2013')) : ''

  const availableYearNumbers = useMemo(() => {
    const set = new Set<number>()
    for (const s of allSubjects) {
      if (typeof s !== 'object' || !s?.questionsByYear) continue
      for (const [y, c] of Object.entries(s.questionsByYear)) {
        const n = Number(y)
        if (Number.isFinite(n) && Number(c) > 0) set.add(n)
      }
    }
    return Array.from(set).sort((a, b) => a - b)
  }, [allSubjects])

  const yearOptions = useMemo(() => {
    const opts: { label: string; value: string; years: number[] }[] = []
    for (let i = 0; i < availableYearNumbers.length; ) {
      const a = availableYearNumbers[i]
      const b = availableYearNumbers[i + 1]
      if (b !== undefined && b === a + 1) {
        opts.push({ label: `${a}\u2013${b}`, value: `${a},${b}`, years: [a, b] })
        i += 2
      } else {
        opts.push({ label: `${a}`, value: `${a}`, years: [a] })
        i += 1
      }
    }
    return opts
  }, [availableYearNumbers])

  const effectiveYear = useMemo(() => {
    if (!yearOptions.length) return year
    if (yearOptions.some(o => o.value === year)) return year
    const n = Number(String(year).split(/[,\u2013-]/)[0])
    if (Number.isFinite(n)) {
      const match = yearOptions.find(o => o.years.includes(n))
      if (match) return match.value
    }
    return yearOptions[0].value
  }, [yearOptions, year])

  const selectedYearNumbers = useMemo(() => {
    const opt = yearOptions.find(o => o.value === effectiveYear)
    if (opt) return opt.years
    return effectiveYear ? effectiveYear.split(',').map(v => Number(v.trim())).filter(v => Number.isFinite(v)) : []
  }, [yearOptions, effectiveYear])

  const subjectsForYear = useMemo(() => {
    if (!selectedYearNumbers.length) {
      return allSubjects.map(s => {
        const name = subjectName(s)
        const base = typeof s === 'object' && s ? s : {}
        const qby = (base as any).questionsByYear || {}
        const hasBreakdown = Object.values(qby).some(c => Number(c) > 0)
        const count = hasBreakdown ? 0 : (Number((base as any).questions) || 0)
        return {
          subject: name,
          questions: count,
          years: hasBreakdown ? '' : String((base as any).years || ''),
          required: !!(base as any).required || name.toLowerCase().includes('english'),
          questionsByYear: qby,
        }
      }).filter(s => s.subject && s.questions > 0)
    }
    return allSubjects.map(s => {
      const name = subjectName(s)
      const base = typeof s === 'object' && s ? s : {}
      const qby = (base as any).questionsByYear || {}
      const count = selectedYearNumbers.reduce((sum, y) => sum + (Number(qby[String(y)]) || 0), 0)
      const yearsLabel = selectedYearNumbers.length === 2 ? `${selectedYearNumbers[0]}\u2013${selectedYearNumbers[1]}` : `${selectedYearNumbers[0] || ''}`
      return {
        subject: name,
        questions: count,
        years: yearsLabel,
        required: !!(base as any).required || name.toLowerCase().includes('english'),
        questionsByYear: qby,
      }
    }).filter(s => s.subject && s.questions > 0)
  }, [allSubjects, selectedYearNumbers])

  const totalQuestions = subjectsForYear.reduce((sum, s) => sum + (s.questions || 0), 0)
  const recommendedDuration = Math.max(1, Math.ceil((totalQuestions || 0) * 1.2) || 60)

  useEffect(() => {
    if (isJambFlow) return
    if (effectiveYear !== year) setYear(effectiveYear)
  }, [effectiveYear, year, isJambFlow])

  // When year (availability context) changes, auto-adjust duration to fit available questions.
  useEffect(() => {
    if (isJambFlow) return
    if (!availabilityKnown) return
    if (yearAdjustedRef.current === effectiveYear) return
    yearAdjustedRef.current = effectiveYear
    if (totalQuestions > 0) setDuration(recommendedDuration)
  }, [effectiveYear, availabilityKnown, totalQuestions, recommendedDuration, isJambFlow])

  // Keep config in sync so downstream steps (instructions/test) use year-filtered subjects/counts.
  useEffect(() => {
    const nextYear = isJambFlow ? (testConfig.year || effectiveYear || year) : (effectiveYear || year)
    const nextSubjects = isJambFlow ? (testConfig.subjects || []) : subjectsForYear
    const nextTotal = isJambFlow ? (Number(testConfig.totalQuestions) || totalQuestions) : totalQuestions
    const subjectsChanged =
      (nextSubjects || []).length !== (testConfig.subjects || []).length ||
      (nextSubjects || []).some((s: any, i: number) => subjectName((testConfig.subjects || [])[i] as any) !== subjectName(s) || Number(((testConfig.subjects || [])[i] as any)?.questions) !== Number(s?.questions))
    const shouldUpdate =
      (!isJambFlow && subjectsChanged) ||
      testConfig.year !== nextYear ||
      (!isJambFlow && testConfig.totalQuestions !== nextTotal) ||
      testConfig.duration !== duration ||
      testConfig.mode !== mode ||
      testConfig.difficulty !== difficulty ||
      testConfig.topic !== topic ||
      testConfig.showAnswers !== (mode === 'practice')
    if (!shouldUpdate) return
    setTestConfig({
      ...testConfig,
      subjects: nextSubjects,
      year: nextYear,
      totalQuestions: nextTotal,
      duration,
      mode,
      difficulty,
      topic,
      showAnswers: mode === 'practice',
      examId: selectedExam?.id || testConfig.examId || testConfig.customExamId || '',
      examTitle: selectedExam?.title || testConfig.examTitle || testConfig.customTitle || '',
      subject: isJambFlow ? (lockedSubject || (testConfig as any).subject) : (testConfig as any).subject,
      selectedSubject: isJambFlow ? (lockedSubject || (testConfig as any).selectedSubject) : (testConfig as any).selectedSubject,
    })
  }, [subjectsForYear, effectiveYear, totalQuestions, duration, mode, difficulty, topic, selectedExam, year, isJambFlow, lockedSubject, testConfig.year, testConfig.totalQuestions, testConfig.subjects])

  const timePerQuestion = useMemo(() => {
    if (!totalQuestions) return 0
    return (duration * 60 / totalQuestions).toFixed(0)
  }, [duration, totalQuestions])

  const handleYearChange = (nextYear: string) => {
    yearAdjustedRef.current = ''
    setYear(nextYear)
  }

  const handleContinue = () => {
    const nextSubjects = isJambFlow ? (testConfig.subjects || []) : subjectsForYear
    const nextTotal = isJambFlow ? (Number(testConfig.totalQuestions) || totalQuestions) : totalQuestions
    if (!nextSubjects.length || nextTotal <= 0) return
    const finalConfig: TestConfigType = {
      ...testConfig,
      mode,
      duration,
      year: isJambFlow ? (testConfig.year || effectiveYear || year) : (effectiveYear || year),
      difficulty,
      topic,
      showAnswers: mode === 'practice',
      examId: selectedExam?.id || testConfig.examId || testConfig.customExamId || '',
      examTitle: selectedExam?.title || testConfig.examTitle || testConfig.customTitle || '',
      subjects: nextSubjects,
      totalQuestions: nextTotal,
      subject: isJambFlow ? (lockedSubject || (testConfig as any).subject) : (testConfig as any).subject,
      selectedSubject: isJambFlow ? (lockedSubject || (testConfig as any).selectedSubject) : (testConfig as any).selectedSubject,
      yearRangeLabel: isJambFlow ? ((testConfig as any).yearRangeLabel || lockedYearLabel) : (testConfig as any).yearRangeLabel,
      years: isJambFlow ? (testConfig as any).years : (testConfig as any).years,
      jambFlow: testConfig.jambFlow,
      jambLockedSelection: testConfig.jambLockedSelection,
    }
    setTestConfig(finalConfig)
    setActivePage('testInstructions')
  }

  const selectedSubjectNames = subjectsForYear.map(s => s.subject).filter(Boolean)
  const hasQuestionYearData = allSubjects.some(s => typeof s === 'object' && s?.questionsByYear && Object.keys(s.questionsByYear || {}).length > 0)
  const noAvailable = (hasQuestionYearData || availabilityKnown) && (!yearOptions.length || !subjectsForYear.length || totalQuestions <= 0)

  return (
    <div className="config-page">
      <div className="config-header">
        <button className="back-circle1" onClick={() => setActivePage(isJambFlow ? 'questionYears' : 'subjects')}><ArrowLeft size={18}/></button>
        <div><h1>{isJambFlow ? 'JAMB Test Configuration' : 'Configure Test'}</h1><p>{testConfig.examType}{(isJambFlow ? lockedSubject : selectedSubjectNames.join(', ')) ? ` • ${isJambFlow ? lockedSubject : selectedSubjectNames.join(', ')}` : ''}{isJambFlow && lockedYearLabel ? ` • ${lockedYearLabel}` : ''} • {(isJambFlow ? (Number(testConfig.totalQuestions) || totalQuestions) : totalQuestions) || 0} Questions</p></div>
      </div>

      <div className="config-card highlight">
        <h3>Selected Subjects</h3>
        <div className="selected-subjects-list">
         {subjectsForYear.map((s: any) => {
           const name = subjectName(s)
           const qs = `${s.questions} Qs • ${s.years || ''}`
           return (
            <div key={name} className="selected-subject-item">
              <span className="s-name">{name}</span>
              <span className="s-q">{qs}</span>
            </div>
           )
         })}
         {subjectsForYear.length === 0 && <div className="selected-subject-item"><span className="s-name">No subjects available for this year.</span></div>}
        </div>
        <div className="total-q"><span>Total</span><b>{(isJambFlow ? (Number(testConfig.totalQuestions) || totalQuestions) : totalQuestions)} Qs • {duration} mins • ~{(isJambFlow ? (Number(testConfig.totalQuestions) || totalQuestions) : totalQuestions) ? (duration * 60 / (isJambFlow ? (Number(testConfig.totalQuestions) || totalQuestions) : totalQuestions)).toFixed(0) : 0}s per Q</b></div>
        {availabilityKnown && <p style={{margin:'8px 0 0', fontSize:12, color:'#8f9091'}}>Subjects and question counts update automatically when you change the year.</p>}
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
        <div className="config-row"><label>{isJambFlow ? 'Question Years' : 'Year'}</label>{isJambFlow ? <div className="config-select small" style={{display:'flex',alignItems:'center'}}>{lockedYearLabel || 'Selected'}</div> : <select className="config-select small" value={effectiveYear || ''} onChange={(e) => handleYearChange(e.target.value)} disabled={!yearOptions.length}>{yearOptions.length ? yearOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>) : <option value="">No available years</option>}</select>}</div>
        <div className="config-row"><label>Difficulty</label><select className="config-select small" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}><option value="General">General</option><option value="Easy">Easy</option><option value="Normal">Normal</option><option value="Hard">Hard</option></select></div>
        <div className="config-row"><label>Topic</label><select className="config-select small" value={topic} onChange={(e) => setTopic(e.target.value)}><option value="All Topics">All Topics</option><option value="Random">Random Mix</option></select></div>
      </div>

          {noAvailable && <div className="config-card" style={{borderColor:'var(--danger, #7f1d1d)', color:'var(--danger-text, #fca5a5)'}}>No questions are available for the selected subjects in any year. Go back and choose different subjects.</div>}
      <button className="continue-btn" onClick={handleContinue} disabled={noAvailable || !subjectsForYear.length || totalQuestions <= 0}><Check size={18}/> CONTINUE TO INSTRUCTIONS</button>
    </div>
  )
}
