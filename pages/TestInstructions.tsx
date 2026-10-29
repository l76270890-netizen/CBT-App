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

  return (
    <div className="instruction-page">
      <div className="instruction-header">
        <button className="back-circle" onClick={() => setActivePage('testConfig')}><ArrowLeft size={18}/></button>
        <div><h1>Test Instructions</h1><p>Read carefully before you begin</p></div>
      </div>

      <div className="info-card">
        <h3><Info size={16}/> Exam Details from TestConfig</h3>
        <div className="info-grid">
          <div className="info-item"><span>Exam Type</span><strong>{testConfig.examType}</strong></div>
          <div className="info-item"><span>Year</span><strong>{testConfig.year}</strong></div>
          <div className="info-item"><span>Mode</span><strong>{testConfig.mode} ({testConfig.difficulty})</strong></div>
          <div className="info-item"><span>Topic</span><strong>{testConfig.topic}</strong></div>
          <div className="info-item full"><span>Subjects</span><strong>{testConfig.subjects.map(s => s.subject).join(' + ')}</strong></div>
          <div className="info-item"><span>Questions</span><strong>{testConfig.totalQuestions}</strong></div>
          <div className="info-item"><span>Duration</span><strong className="highlight">{totalHours>0? `${totalHours}h ${mins}m` : `${mins}m`}</strong></div>
        </div>
      </div>

      <div className="instruction-card">
        <h3><FileQuestion size={16}/> How it works</h3>
        <ul>
          <li><span className="icon-b"><Clock size={14}/></span> You have <b>{totalHours>0? `${totalHours}h ${mins}m` : `${mins} minutes`}</b> for <b>{testConfig.totalQuestions} questions</b>.</li>
          <li><span className="icon-b"><Grid3X3 size={14}/></span> Use <b>Previous / Next</b> to navigate. Tap grid icon to jump.</li>
          <li><span className="icon-b"><CheckCircle2 size={14}/></span> Answered turn <span className="dot green"></span> green on grid.</li>
          <li><span className="icon-b"><TimerOff size={14}/></span> Don't refresh - timer keeps running. Mode: <b>{testConfig.mode}</b></li>
        </ul>
      </div>

      <div className="warning-card">
        <div className="warning-icon"><AlertTriangle size={18}/></div>
        <div><h4>Auto-Submit Warning</h4><p>Test submits automatically when time ends. Year {testConfig.year} questions included.</p></div>
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
          {agreed? `Start ${testConfig.examType} Test Now →` : 'Please agree to continue'}
        </button>
      </div>
    </div>
  )
}