type Props = {
  setActivePage: (page: string) => void
  testConfig: {
    examType: string
    subjects: any[] // <-- CHANGED FROM string[]
    totalQuestions: number
    year: string
    duration: number
    mode: 'exam' | 'practice'
    difficulty: string
    showAnswers: boolean
    topic: string
  }
  setTestConfig: (config: any) => void
}

import { useState } from 'react'
import './TestConfig.css'

export default function TestConfig({ setActivePage, testConfig, setTestConfig }: Props) {
  const [mode, setMode] = useState<'exam' | 'practice'>(testConfig.mode || 'exam')
  const [duration, setDuration] = useState(testConfig.duration || 120)
  const [year, setYear] = useState(testConfig.year || '2025')
  const [difficulty, setDifficulty] = useState(testConfig.difficulty || 'General')
  const [topic, setTopic] = useState(testConfig.topic || 'All Topics')

  const handleContinue = () => {
    const finalConfig = {
     ...testConfig,
      mode,
      duration,
      year,
      difficulty,
      topic,
      showAnswers: mode === 'practice',
      totalQuestions: testConfig.totalQuestions // <-- use what subjects page calculated
    }
    setTestConfig(finalConfig)
    setActivePage('test')
  }

  return (
    <div className="config-page">
      <div className="config-header">
        <button className="back-circle" onClick={() => setActivePage('subjects')}>←</button>
        <h1>Subject configuration</h1>
      </div>


      {/* NEW: SHOW SELECTED SUBJECTS */}
      <div className="config-card">
        <h3>Selected Subjects</h3>
        <div className="selected-subjects-list">
          {testConfig.subjects.map((s: any) => (
            <div key={s.subject} className="selected-subject-item">
              <span>{s.icon} {s.subject}</span>
              <span>{s.questions} Qs</span>
            </div>
          ))}
        </div>
        <div className="total-q">Total: {testConfig.totalQuestions} Questions</div>
      </div>

      <div className="config-card">
        <h3>Choose practise mode</h3>
        <div className="mode-options">
          <button className={`mode-option ${mode === 'exam'? 'active' : ''}`} onClick={() => setMode('exam')}>
            <div className="radio">{mode === 'exam' && <div className="radio-inner"></div>}</div>
            <span>Exam Mode</span>
          </button>
          <button className={`mode-option ${mode === 'practice'? 'active' : ''}`} onClick={() => setMode('practice')}>
            <div className="radio">{mode === 'practice' && <div className="radio-inner"></div>}</div>
            <span>Study Mode</span>
          </button>
        </div>
        <p className="mode-hint">Timed and graded like the real exam</p>
      </div>

      <div className="config-card">
        <h3>Test duration</h3>
        <select className="config-select" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
          <option value={30}>30 minutes</option>
          <option value={40}>40 minutes</option>
          <option value={60}>1 hour</option>
          <option value={120}>2 hours</option>
          <option value={180}>3 hours</option>
        </select>
      </div>

      <div className="config-card">
        <h3 className="account-title">Account</h3>
        <div className="config-row">
          <label>Year</label>
          <select className="config-select" value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
            <option value="2023">2023</option>
            <option value="2023">2022</option>
            <option value="2023">2021</option>
            <option value="2023">2020</option>
            <option value="2023">2019</option>
            <option value="2023">2018</option>
            <option value="2023">2017</option>
            <option value="2023">2016</option>
            <option value="2023">2015</option>
            <option value="2023">2014</option>
            <option value="2023">2013</option>
            <option value="2023">2012</option>
            <option value="2023">2011</option>
            <option value="2023">2010</option>
          </select>
        </div>
        <div className="config-row">
          <label>Difficulty</label>
          <select className="config-select" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option value="General">General</option><option value="Easy">Easy</option><option value="Normal">Normal</option><option value="Hard">Hard</option>
          </select>
        </div>
        <div className="config-row">
          <label>Topic</label>
          <select className="config-select" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option value="General">All Topics</option>
            <option value="Easy">Random</option>
           
          </select>
        </div>
      </div>

      <button className="continue-btn" onClick={handleContinue}>
        CONTINUE
      </button>
    </div>
  )
}