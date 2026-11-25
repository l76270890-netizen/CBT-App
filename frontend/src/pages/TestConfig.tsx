import { useState, useMemo, useEffect, useRef } from 'react'
import { ArrowLeft, Clock, Timer, BookCheck, GraduationCap, Check, Download, Loader2, Grid3X3 } from 'lucide-react'
import type { TestConfigType } from '../types'
import { downloadQuestionsForTest } from '../offline/questions'
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
  const [downloading, setDownloading] = useState(false)
  const [downloadMessage, setDownloadMessage] = useState('')
  const [downloadError, setDownloadError] = useState('')
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
  const jambTotal = isJambFlow ? (Number(testConfig.totalQuestions) || totalQuestions) : totalQuestions

  const QUESTION_COUNT_OPTIONS = [15, 40, 50] as const
  const effectiveQuestionCount = questionCount || jambTotal || 0
  const countExceedsBank = effectiveQuestionCount > 0 && jambTotal > 0 && effectiveQuestionCount > jambTotal
  const effectiveDuration = countExceedsBank ? recommendedDuration : duration

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
      testConfig.questionCount !== questionCount ||
      testConfig.duration !== effectiveDuration ||
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
      questionCount,
      duration: effectiveDuration,
      mode,
      difficulty,
      topic,
      showAnswers: mode === 'practice',
      fromStudy: mode === 'practice' ? !!testConfig.fromStudy : false,
      examId: selectedExam?.id || testConfig.examId || testConfig.customExamId || '',
      examTitle: selectedExam?.title || testConfig.examTitle || testConfig.customTitle || '',
      subject: isJambFlow ? (lockedSubject || (testConfig as any).subject) : (testConfig as any).subject,
      selectedSubject: isJambFlow ? (lockedSubject || (testConfig as any).selectedSubject) : (testConfig as any).selectedSubject,
    })
  }, [subjectsForYear, effectiveYear, totalQuestions, questionCount, effectiveDuration, duration, mode, difficulty, topic, selectedExam, year, isJambFlow, lockedSubject, testConfig.year, testConfig.totalQuestions, testConfig.subjects])

  const timePerQuestion = useMemo(() => {
    const total = effectiveQuestionCount || jambTotal
    if (!total) return 0
    return (effectiveDuration * 60 / total).toFixed(0)
  }, [effectiveDuration, effectiveQuestionCount, jambTotal])

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
      duration: effectiveDuration,
      year: isJambFlow ? (testConfig.year || effectiveYear || year) : (effectiveYear || year),
      difficulty,
      topic,
      showAnswers: mode === 'practice',
      fromStudy: mode === 'practice' ? !!testConfig.fromStudy : false,
      examId: selectedExam?.id || testConfig.examId || testConfig.customExamId || '',
      examTitle: selectedExam?.title || testConfig.examTitle || testConfig.customExamId || '',
      subjects: nextSubjects,
      totalQuestions: nextTotal,
      questionCount,
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

  const handleDownload = async () => {
    const offlineConfig: TestConfigType = {
      ...testConfig,
      examId: selectedExam?.id || testConfig.examId || testConfig.customExamId || '',
      subjects: isJambFlow ? (testConfig.subjects || []) : subjectsForYear,
      totalQuestions: isJambFlow ? (Number(testConfig.totalQuestions) || totalQuestions) : totalQuestions,
      questionCount,
      year: isJambFlow ? (testConfig.year || effectiveYear || year) : (effectiveYear || year),
      duration: effectiveDuration,
      mode,
      difficulty,
      topic,
    }
    setDownloading(true)
    setDownloadMessage('')
    setDownloadError('')
    try {
      const results = await downloadQuestionsForTest(offlineConfig)
      const questionCount = results.reduce((sum, item) => sum + item.questions, 0)
      const imageCount = results.reduce((sum, item) => sum + item.images, 0)
      setDownloadMessage(`${questionCount} questions and ${imageCount} diagrams saved for offline use.`)
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : 'Could not download questions for offline use.')
    } finally {
      setDownloading(false)
    }
  }

  const selectedSubjectNames = subjectsForYear.map(s => s.subject).filter(Boolean)
  const hasQuestionYearData = allSubjects.some(s => typeof s === 'object' && s?.questionsByYear && Object.keys(s.questionsByYear || {}).length > 0)
  const noAvailable = (hasQuestionYearData || availabilityKnown) && (!yearOptions.length || !subjectsForYear.length || totalQuestions <= 0)

  return (
    <div className="config-page">
      <div className="config-header">
        <button className="back-circle1" onClick={() => setActivePage(isJambFlow ? 'questionYears' : 'subjects')}><ArrowLeft size={18}/></button>
        <div><h1>{isJambFlow ? 'JAMB Test Configuration' : 'Configure Test'}</h1><p>{testConfig.examType}{(isJambFlow ? lockedSubject : selectedSubjectNames.join(', ')) ? ` • ${isJambFlow ? lockedSubject : selectedSubjectNames.join(', ')}` : ''}{isJambFlow && lockedYearLabel ? ` • ${lockedYearLabel}` : ''} • {effectiveQuestionCount || 0} Questions</p></div>
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
        <div className="total-q"><span>Total</span><b>{jambTotal} Qs • {effectiveDuration} mins • ~{timePerQuestion}s per Q</b></div>
        {availabilityKnown && <p style={{margin:'8px 0 0', fontSize:12, color:'#8f9091'}}>Subjects and question counts update automatically when you change the year.</p>}
        {countExceedsBank && <p style={{margin:'8px 0 0', fontSize:12, color:'var(--danger-text, #fca5a5)'}}>Only {jambTotal} questions are available for the selected subjects. The timer has been adjusted to fit the available bank.</p>}
      </div>

      <div className="config-card">
        <h3><Grid3X3 size={14}/> Number of Questions</h3>
        <div className="count-options">
          {QUESTION_COUNT_OPTIONS.map(n => {
            const disabled = jambTotal > 0 && n > jambTotal
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
        {countExceedsBank && <p style={{margin:'10px 0 0', fontSize:12, color:'var(--danger-text, #fca5a5)'}}>The selected subjects only have {jambTotal} questions. Choose fewer questions or go back and select more subjects.</p>}
        <p style={{margin:'10px 0 0', fontSize:12, color:'#8f9091'}}>{questionCount ? `You will answer ${effectiveQuestionCount} questions.` : `All ${jambTotal || 0} available questions will be used.`}</p>
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

          <div className="config-card">
            <h3><Download size={14}/> Offline access</h3>
            <p style={{margin:'0 0 10px', fontSize:13}}>Save this test and its diagrams so you can practise without internet.</p>
            <button type="button" className="dur-btn" onClick={handleDownload} disabled={downloading || noAvailable || !subjectsForYear.length || totalQuestions <= 0} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,width:'100%',padding:'12px'}}>
              {downloading ? <Loader2 size={16} className="spin"/> : <Download size={16}/>} {downloading ? 'Downloading...' : 'Download for Offline'}
            </button>
            {downloadMessage && <p role="status" style={{margin:'10px 0 0',fontSize:12,color:'var(--success, #22c55e)'}}>{downloadMessage}</p>}
            {downloadError && <p role="alert" style={{margin:'10px 0 0',fontSize:12,color:'var(--danger, #ef4444)'}}>{downloadError}</p>}
          </div>

          {noAvailable && <div className="config-card" style={{borderColor:'var(--danger, #7f1d1d)', color:'var(--danger-text, #fca5a5)'}}>No questions are available for the selected subjects in any year. Go back and choose different subjects.</div>}
      <button className="continue-btn" onClick={handleContinue} disabled={noAvailable || !subjectsForYear.length || totalQuestions <= 0}><Check size={18}/> CONTINUE TO INSTRUCTIONS</button>
    </div>
  )
}
