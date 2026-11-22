import { useMemo } from 'react'
import { ArrowLeft, CalendarDays } from 'lucide-react'
import type { TestConfigType } from '../types'
import './QuestionYears.css'

type Props = {
  setActivePage: (page: string) => void
  testConfig: TestConfigType
  setTestConfig: (config: TestConfigType) => void
}

type SubjectLike = { subject?: string; name?: string; questions?: number; questionsByYear?: Record<string, number> } | string

const subjectName = (s: SubjectLike) => (typeof s === 'string' ? s : s?.subject || s?.name || '')

export default function QuestionYears({ setActivePage, testConfig, setTestConfig }: Props) {
  const selected = (testConfig.subjects?.[0] || null) as SubjectLike | null
  const name = subjectName(selected || '') || (testConfig as any).selectedSubject || 'Subject'
  const qby = (typeof selected === 'object' && selected?.questionsByYear) ? selected.questionsByYear : {}

  const ranges = useMemo(() => {
    const years = Object.entries(qby)
      .filter(([, c]) => Number(c) > 0)
      .map(([y]) => Number(y))
      .filter(y => Number.isFinite(y))
      .sort((a, b) => a - b)
    const opts: { label: string; years: number[]; questions: number }[] = []
    for (let i = 0; i < years.length; ) {
      const a = years[i]
      const b = years[i + 1]
      if (b !== undefined && b === a + 1) {
        const questions = (Number(qby[String(a)]) || 0) + (Number(qby[String(b)]) || 0)
        opts.push({ label: `${a} – ${b}`, years: [a, b], questions })
        i += 2
      } else {
        const questions = Number(qby[String(a)]) || 0
        opts.push({ label: `${a}`, years: [a], questions })
        i += 1
      }
    }
    return opts.filter(r => r.questions > 0)
  }, [qby])

  const handleSelect = (range: { label: string; years: number[]; questions: number }) => {
    const subjBase = typeof selected === 'object' && selected ? selected : { subject: name }
    const subject = {
      ...subjBase,
      subject: name,
      questions: range.questions,
      years: range.label,
      questionsByYear: qby,
    }
    setTestConfig({
      ...testConfig,
      examType: 'JAMB',
      subjects: [subject as any],
      subject: name,
      selectedSubject: name,
      year: range.years.join(','),
      years: range.years,
      yearRangeLabel: range.label,
      yearRange: range.years.length === 2 ? { startYear: range.years[0], endYear: range.years[1] } : { startYear: range.years[0], endYear: range.years[0] },
      totalQuestions: range.questions,
      duration: Math.max(1, Math.ceil(Math.min(range.questions, 40) * 1.2) || 30),
      jambFlow: true,
      jambLockedSelection: true,
      mode: testConfig.mode || 'exam',
      difficulty: testConfig.difficulty || 'General',
      topic: 'All Topics',
      showAnswers: testConfig.mode === 'practice',
      fromStudy: (testConfig.mode || 'exam') === 'practice' ? !!testConfig.fromStudy : false,
    } as TestConfigType)
    setActivePage('testConfig')
  }

  return (
    <div className="qy-page">
      <div className="qy-header">
        <button className="qy-back" onClick={() => setActivePage('subjects')} aria-label="Back"><ArrowLeft size={18} /></button>
        <div>
          <h1>Choose Question Years</h1>
          <p>JAMB • {name}</p>
        </div>
      </div>

      <div className="qy-info">
        <CalendarDays size={16} />
        <span>Select one two-year card. Only year ranges with available questions for {name} are shown.</span>
      </div>

      {ranges.length === 0 ? (
        <div className="qy-empty">No question years are available for {name} yet.</div>
      ) : (
        <div className="qy-grid">
          {ranges.map(range => (
            <button
              key={range.label}
              type="button"
              className="qy-card"
              onClick={() => handleSelect(range)}
            >
              <span className="qy-card-years">{range.label}</span>
              <span className="qy-card-count">{range.questions} question{range.questions === 1 ? '' : 's'} available</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
