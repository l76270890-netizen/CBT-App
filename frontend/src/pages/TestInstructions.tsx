import { useState } from 'react'
import { ArrowLeft, Clock, FileQuestion, AlertTriangle, CheckCircle2, Grid3X3, TimerOff, Info } from 'lucide-react'
import type { TestConfigType } from '../types'
import './TestInstructions.css'

type Props = {
  setActivePage: (page: string) => void
  testConfig: TestConfigType
}

export default function TestInstructions({ setActivePage, testConfig }: Props) {
  const [agreed, setAgreed] = useState(false)
  const totalMinutes = testConfig.duration
  const totalHours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60
  const isJambFlow = !!((testConfig as any).jambFlow || (String(testConfig.examType || '').toUpperCase() === 'JAMB' && (testConfig as any).jambLockedSelection))
  const yearLabel = (testConfig as any).yearRangeLabel || (typeof testConfig.subjects?.[0] === 'object' ? String((testConfig.subjects?.[0] as any)?.years || '') : '') || String(testConfig.year || '').replace(',', '–')
  const subjectLabel = isJambFlow
    ? ((testConfig as any).selectedSubject || (testConfig as any).subject || testConfig.subjects?.[0]?.subject || '')
    : testConfig.subjects.map(s => s.subject).join(' + ')
  const effectiveCount = testConfig.questionCount || testConfig.totalQuestions

  return (
    <div className="instruction-page">
      <div className="instruction-header">
        <button className="back-circle" onClick={() => setActivePage('testConfig')}><ArrowLeft size={18}/></button>
        <div><h1>Test Instructions</h1><p>{isJambFlow ? 'Review your JAMB test details before you begin' : 'Read carefully before you begin'}</p></div>
      </div>

      <div className="info-card">
        <h3><Info size={16}/> {isJambFlow ? 'JAMB Examination Details' : 'Exam Details from TestConfig'}</h3>
        <div className="info-grid">
          <div className="info-item"><span>Exam Type</span><strong>{testConfig.examType}</strong></div>
          <div className="info-item full"><span>Subject</span><strong>{subjectLabel || '—'}</strong></div>
          <div className="info-item full"><span>Question Years</span><strong>{yearLabel || '—'}</strong></div>
          <div className="info-item"><span>Questions</span><strong>{effectiveCount}</strong></div>
          <div className="info-item"><span>Duration</span><strong className="highlight">{totalHours>0? `${totalHours}h ${mins}m` : `${mins} Minutes`}</strong></div>
          <div className="info-item"><span>Mode</span><strong>{testConfig.mode} ({testConfig.difficulty})</strong></div>
          {!isJambFlow && <div className="info-item"><span>Topic</span><strong>{testConfig.topic}</strong></div>}
          {!isJambFlow && <div className="info-item full"><span>Subjects</span><strong>{testConfig.subjects.map(s => s.subject).join(' + ')}</strong></div>}
        </div>
      </div>

      <div className="instruction-card">
        <h3><FileQuestion size={16}/> Instructions</h3>
        <ul>
          <li><span className="icon-b"><Clock size={14}/></span> Read every question carefully.</li>
          <li><span className="icon-b"><CheckCircle2 size={14}/></span> Select the best answer for each question.</li>
          <li><span className="icon-b"><Grid3X3 size={14}/></span> You can navigate between questions before submitting.</li>
          <li><span className="icon-b"><TimerOff size={14}/></span> Keep track of your remaining time; your test may automatically submit when time expires.</li>
          <li><span className="icon-b"><Info size={14}/></span> Review your answers before submitting. You have <b>{totalHours>0? `${totalHours}h ${mins}m` : `${mins} minutes`}</b> for <b>{effectiveCount} questions</b>.</li>
        </ul>
      </div>

      <div className="warning-card">
        <div className="warning-icon"><AlertTriangle size={18}/></div>
        <div><h4>Before you start</h4><p>{isJambFlow ? `${testConfig.examType} • ${subjectLabel} • ${yearLabel}` : `Test submits automatically when time ends. Year ${yearLabel} questions included.`}</p></div>
      </div>

      <div className="agree-card">
        <label className="agree-label">
          <input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)} />
          <span className="custom-check"></span>
          <span>I have read and understood the instructions for {testConfig.examType}</span>
        </label>
      </div>

      <div className="start-section">
        <button className="start-test-btn" disabled={!agreed} onClick={() => setActivePage('test')}>
          {agreed ? 'START EXAM' : 'Please agree to continue'}
        </button>
      </div>
    </div>
  )
}