import { useState, useMemo } from 'react'
import { ArrowLeft, Clock, Timer, BookCheck, GraduationCap, Check } from 'lucide-react'
import type { TestConfigType, SubjectData } from '../types'
import './TestConfig.css'

type Props = {
  setActivePage: (page: string) => void
  testConfig: TestConfigType
  setTestConfig: (config: TestConfigType) => void
}

export default function TestConfig({ setActivePage, testConfig, setTestConfig }: Props) {
  const [mode, setMode] = useState<'exam' | 'practice'>(testConfig.mode || 'exam')
  const [duration, setDuration] = useState(testConfig.duration || Math.ceil(testConfig.totalQuestions * 1.2))
  const [year, setYear] = useState(testConfig.year || '2024')
  const [difficulty, setDifficulty] = useState(testConfig.difficulty || 'General')
  const [topic, setTopic] = useState(testConfig.topic || 'All Topics')

  const years = Array.from({ length: 16 }, (_, i) => `${2025 - i}`)

  const timePerQuestion = useMemo(() => {
    if (!testConfig.totalQuestions) return 0
    return (duration * 60 / testConfig.totalQuestions).toFixed(0)
  }, [duration, testConfig.totalQuestions])

  const handleContinue = () => {
    const finalConfig: TestConfigType = {
      ...testConfig,
      mode,
      duration,
      year,
      difficulty,
      topic,
      showAnswers: mode === 'practice',
      totalQuestions: testConfig.totalQuestions
    }
    setTestConfig(finalConfig)
    setActivePage('TestInstructions')
  }

  return (
    <div className="config-page">
      <div className="config-header">
        <button className="back-circle1" onClick={() => setActivePage('subjects')}><ArrowLeft size={18}/></button>
        <div>
          <h1>Configure Test</h1>
          <p>{testConfig.examType} • {testConfig.totalQuestions} Questions</p>
        </div>
      </div>

      <div className="config-card highlight">
        <h3>Selected Subjects</h3>
        <div className="selected-subjects-list">
         {testConfig.subjects.map((s: SubjectData) => (
            <div key={s.subject} className="selected-subject-item">
              <span className="s-name">{s.subject}</span>
              <span className="s-q">{s.questions} Qs • {s.years}</span>
            </div>
          ))}
        </div>
        <div className="total-q">
          <span>Total</span>
          <b>{testConfig.totalQuestions} Qs • {duration} mins • ~{timePerQuestion}s per Q</b>
        </div>
      </div>

      <div className="config-card">
        <h3>Choose practise mode</h3>
        <div className="mode-options">
          <button className={`mode-option ${mode === 'exam' ? 'active' : ''}`} onClick={() => setMode('exam')}>
            <div className="mode-icon"><Timer size={18}/></div>
            <div className="mode-text"><span>Exam Mode</span><p>Timed, graded like real exam</p></div>
            <div className="radio">{mode === 'exam' && <div className="radio-inner"></div>}</div>
          </button>
          <button className={`mode-option ${mode === 'practice' ? 'active' : ''}`} onClick={() => setMode('practice')}>
            <div className="mode-icon"><BookCheck size={18}/></div>
            <div className="mode-text"><span>Study Mode</span><p>See answers instantly</p></div>
            <div className="radio">{mode === 'practice' && <div className="radio-inner"></div>}</div>
          </button>
        </div>
      </div>

      <div className="config-card">
        <h3><Clock size={14}/> Test duration</h3>
        <div className="duration-grid">
          {[30,45,60,90,120,180].map(d => (
            <button key={d} className={`dur-btn ${duration===d?'active':''}`} onClick={()=>setDuration(d)}>
              {d < 60 ? `${d}m` : `${d/60}h`}
            </button>
          ))}
        </div>
        <select className="config-select" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
          <option value={30}>30 minutes</option>
          <option value={45}>45 minutes</option>
          <option value={60}>1 hour</option>
          <option value={90}>1.5 hours</option>
          <option value={120}>2 hours</option>
          <option value={180}>3 hours</option>
        </select>
      </div>

      <div className="config-card">
        <h3 className="account-title"><GraduationCap size={16}/> Test Settings</h3>
        <div className="config-row">
          <label>Year</label>
          <select className="config-select small" value={year} onChange={(e) => setYear(e.target.value)}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="config-row">
          <label>Difficulty</label>
          <select className="config-select small" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option value="General">General</option><option value="Easy">Easy</option><option value="Normal">Normal</option><option value="Hard">Hard</option>
          </select>
        </div>
        <div className="config-row">
          <label>Topic</label>
          <select className="config-select small" value={topic} onChange={(e) => setTopic(e.target.value)}>
            <option value="All Topics">All Topics</option><option value="Random">Random Mix</option>
          </select>
        </div>
      </div>

      <button className="continue-btn" onClick={handleContinue}><Check size={18}/> CONTINUE TO INSTRUCTIONS</button>
    </div>
  )
}