import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { ArrowLeft, ArrowRight, BarChart3, BookOpen, BookOpenCheck, Check, Clock3, Flame, ShieldCheck, Target, Trophy, Zap } from 'lucide-react'
import { demoExams, type DemoExam } from '../data/demoContent'
import type { Question } from '../types'
import heroImage from '../assets/hero.png'
import './Home.css'
import './TestPage.css'
import './DemoExperience.css'

type DemoView = 'dashboard' | 'instructions' | 'test' | 'result' | 'review'
type DemoHistoryItem = { title: string; score: number; total: number; date: string; status: 'Passed' | 'Failed' }
type Props = {
  setActivePage: (page: string) => void
  section: string
  setSection: Dispatch<SetStateAction<string>>
  searchQuery: string
  setSearchQuery: (query: string) => void
}

export default function DemoExperience({ setActivePage, section, setSection, searchQuery, setSearchQuery }: Props) {
  const [view, setView] = useState<DemoView>('dashboard')
  const [selectedExam, setSelectedExam] = useState<DemoExam>(demoExams[0])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Array<number | null>>([])
  const [resultScore, setResultScore] = useState(0)
  useEffect(() => {
    setView('dashboard')
  }, [section])
  const [demoHistory, setDemoHistory] = useState<DemoHistoryItem[]>([])
  const question: Question | undefined = selectedExam.questions[currentQuestion]
  const answeredCount = answers.filter(answer => answer !== null).length
  const filteredExams = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return demoExams
    return demoExams.filter(exam =>
      exam.title.toLowerCase().includes(query)
      || exam.examType.toLowerCase().includes(query)
      || exam.subjects.join(' ').toLowerCase().includes(query)
    )
  }, [searchQuery])

  const startExam = (exam: DemoExam) => {
    setSelectedExam(exam)
    setCurrentQuestion(0)
    setAnswers(Array(exam.questions.length).fill(null))
    setView('instructions')
  }

  const finishExam = () => {
    const score = answers.reduce<number>((total, answer, index) => total + (answer === selectedExam.questions[index]?.answer ? 1 : 0), 0)
    setResultScore(score)
    setDemoHistory(previous => [{
      title: selectedExam.title,
      score,
      total: selectedExam.questions.length,
      date: new Date().toISOString(),
      status: score >= selectedExam.questions.length / 2 ? 'Passed' : 'Failed',
    }, ...previous])
    setView('result')
  }

  const goToSection = (nextSection: string) => {
    setSection(nextSection)
    setView('dashboard')
    setSearchQuery('')
  }

  const returnToDashboard = () => {
    setView('dashboard')
    setSection('home')
    setSearchQuery('')
  }

  const renderExamCards = (exams: DemoExam[]) => exams.length ? (
    <div className="exam-list">
      {exams.map(exam => (
        <button key={exam.id} type="button" className="exam-card1 demo-exam-card" onClick={() => startExam(exam)}>
          <span className="exam-icon-wrap1"><BookOpen size={22} /></span>
          <span className="exam-info">
            <strong>{exam.title}</strong>
            <span>{exam.examType} · {exam.subjects.join(', ')}</span>
            <span className="demo-exam-meta">{exam.questions.length} sample questions · {exam.duration} min</span>
          </span>
          <span className="chevron">›</span>
        </button>
      ))}
    </div>
  ) : <div className="no-result">No sample exams match “{searchQuery}”.</div>

  const renderDashboard = () => {
    if (section === 'practiceHistory') {
      return (
        <>
          <div className="section-header"><div><h3>Demo Practice History</h3><span className="demo-section-subtitle">Only sessions completed in this demo are shown.</span></div></div>
          {demoHistory.length ? (
            <div className="exam-list">
              {demoHistory.map((item, index) => (
                <article className="exam-card1 demo-history-card" key={`${item.date}-${index}`}>
                  <span className="exam-icon-wrap1"><Trophy size={20} /></span>
                  <span className="exam-info">
                    <strong>{item.title}</strong>
                    <span>{new Date(item.date).toLocaleString()}</span>
                    <span>{item.score}/{item.total} · {item.status}</span>
                  </span>
                </article>
              ))}
            </div>
          ) : <div className="no-result">Your demo practice sessions will appear here after you complete a sample exam.</div>}
        </>
      )
    }

    if (section === 'classroom') {
      const sampleSubjects = [...new Set(demoExams.flatMap(exam => exam.subjects))]
      return (
        <>
          <div className="section-header"><div><h3>Study Subjects</h3><span className="demo-section-subtitle">Explore subjects available in the sample exams.</span></div></div>
          <div className="exam-list">
            {sampleSubjects.map(subject => {
              const exam = demoExams.find(item => item.subjects.includes(subject))!
              return (
                <button type="button" className="exam-card1 demo-exam-card" key={subject} onClick={() => startExam(exam)}>
                  <span className="exam-icon-wrap1"><BookOpenCheck size={21} /></span>
                  <span className="exam-info"><strong>{subject}</strong><span>Sample questions · {exam.examType}</span></span>
                  <span className="chevron">›</span>
                </button>
              )
            })}
          </div>
        </>
      )
    }

    const isHome = section === 'home'
    return (
      <>
        {isHome && (
          <>
            <div className="hero-search-bar">
              <div className="search-wrapper">
                <BookOpen className="search-icon" size={18} />
                <input
                  type="search"
                  className="hero-input-box"
                  aria-label="Search demo exams"
                  placeholder="Search JAMB, WAEC..."
                  value={searchQuery}
                  onChange={event => setSearchQuery(event.target.value)}
                />
              </div>
            </div>
            <section className="home-header demo-home-header" aria-label="Demo dashboard welcome">
              <img className="hero-slide is-active" src={heroImage} alt="" />
              <div className="header-overlay" />
              <div className="header-content-exam">
                <span className="demo-home-eyebrow"><ShieldCheck size={14} /> PRIVATE SAMPLE ENVIRONMENT</span>
                <h1 className="home-title">Hello, <span>Demo Learner</span></h1>
                <p className="home-subtitle">Explore the CBT experience with sample exams</p>
                <button type="button" className="hero-btn" onClick={() => setActivePage('register')}>Create account</button>
              </div>
            </section>

            <div className="demo-safety-note"><ShieldCheck size={16} /><span>Demo mode uses sample questions only. Your activity is separate from all real student accounts.</span></div>

            <div className="stats-grid1">
              <div className="stats-card"><div className="stat-icon blue"><Target size={18} /></div><h2>{demoHistory.length}</h2><span>Demo Exams Tried</span></div>
              <div className="stats-card"><div className="stat-icon green"><BarChart3 size={18} /></div><h2>{demoHistory.length ? Math.round(demoHistory.reduce((total, item) => total + item.score / item.total * 100, 0) / demoHistory.length) : 0}%</h2><span>Demo Avg Score</span></div>
              <div className="stats-card"><div className="stat-icon gold"><Trophy size={18} /></div><h2>{demoHistory.length ? Math.max(...demoHistory.map(item => Math.round(item.score / item.total * 100))) : 0}%</h2><span>Demo Best Score</span></div>
              <div className="stats-card"><div className="stat-icon red"><Flame size={18} /></div><h2>{demoExams.reduce((total, exam) => total + exam.questions.length, 0)}</h2><span>Sample Questions</span></div>
            </div>

            <div className="section-header"><h3>Featured Exams ({filteredExams.length})</h3><button type="button" onClick={() => goToSection('exams')}>see more ›</button></div>
            {renderExamCards(filteredExams)}

            <div className="home-extra-sections">
              <section className="home-extra-section" aria-labelledby="demo-quick-practice-title">
                <div className="home-extra-heading">
                  <div className="home-extra-title">
                    <span className="home-extra-icon practice"><Zap size={18} /></span>
                    <div><h3 id="demo-quick-practice-title">Quick practice</h3><p>Jump into a sample practice session</p></div>
                  </div>
                </div>
                <div className="quick-practice-list">
                  {demoExams.map(exam => (
                    <button key={exam.id} type="button" className="quick-practice-card" onClick={() => startExam(exam)}>
                      <span className="quick-practice-card-icon"><ArrowRight size={16} /></span>
                      <span className="quick-practice-card-copy"><strong>{exam.title}</strong><span>{exam.examType} · {exam.questions.length} sample questions</span></span>
                      <span className="chevron">›</span>
                    </button>
                  ))}
                </div>
              </section>
              <section className="home-extra-section" aria-labelledby="demo-upcoming-title">
                <div className="home-extra-heading">
                  <div className="home-extra-title">
                    <span className="home-extra-icon upcoming"><Clock3 size={18} /></span>
                    <div><h3 id="demo-upcoming-title">Upcoming examinations</h3><p>Demo schedule preview</p></div>
                  </div>
                </div>
                <div className="home-extra-empty">Scheduled exam dates are part of the full account experience. This demo includes sample practice exams instead.</div>
              </section>
            </div>
          </>
        )}

        {!isHome && (
          <>
            <div className="section-header"><div><h3>Available Exams ({filteredExams.length})</h3><span className="demo-section-subtitle">Sample exams only · no private or live exams are shown.</span></div></div>
            {renderExamCards(filteredExams)}
          </>
        )}

        <footer className="demo-home-footer">
          <span>Enjoying the demo? Create an account to explore the full platform.</span>
          <button type="button" onClick={() => setActivePage('register')}>Create Account <ArrowRight size={15} /></button>
        </footer>
      </>
    )
  }

  if (view === 'test' && question) {
    return (
      <div className="test-page1 demo-test-page">
        <div className="test-header">
          <button className="exit-btn" type="button" aria-label="Exit sample exam" onClick={() => setView('instructions')}><ArrowLeft size={18} /></button>
          <div className="demo-test-heading">{selectedExam.title}<span>DEMO EXAM</span></div>
          <div className="test-q-count">Q {currentQuestion + 1}/{selectedExam.questions.length} · {answeredCount} Answered</div>
        </div>
        <div className="account"><div className="test-subject">{question.subject}</div><div className="test-q-count">Question {currentQuestion + 1} of {selectedExam.questions.length}</div></div>
        <div className="test-body">
          <div className="question-card">
            <h2 className="question-text">{question.question}</h2>
            <div className="options">
              {question.options.map((option, index) => (
                <button type="button" key={option} className={`option-btn${answers[currentQuestion] === index ? ' selected' : ''}`} onClick={() => setAnswers(previous => previous.map((answer, answerIndex) => answerIndex === currentQuestion ? index : answer))}>
                  <span className="option-label">{String.fromCharCode(65 + index)}</span><span>{option}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="test-footer demo-test-footer">
          <button className="nav-btn" type="button" disabled={currentQuestion === 0} onClick={() => setCurrentQuestion(index => index - 1)}>← Previous</button>
          {currentQuestion === selectedExam.questions.length - 1
            ? <button className="submit-btn" type="button" onClick={finishExam}>Finish Demo</button>
            : <button className="nav-btn primary" type="button" onClick={() => setCurrentQuestion(index => index + 1)}>Next →</button>}
        </div>
      </div>
    )
  }

  if (view === 'instructions') {
    return (
      <div className="home-container demo-content">
        <section className="home-header demo-home-header demo-instruction-header">
          <img className="hero-slide is-active" src={heroImage} alt="" />
          <div className="header-overlay" />
          <div className="header-content-exam">
            <span className="demo-home-eyebrow">SAMPLE EXAM</span>
            <h1 className="home-title">{selectedExam.title}</h1>
            <p className="home-subtitle">{selectedExam.examType} · {selectedExam.subjects.join(', ')}</p>
          </div>
        </section>
        <section className="home-extra-section demo-instruction-card">
          <h2>Before you begin</h2>
          <p>This short, sample-only session shows how the CBT exam screen works. Nothing is saved to a real student account.</p>
          <div className="demo-instruction-meta"><span><BookOpenCheck size={16} /> {selectedExam.questions.length} sample questions</span><span><Clock3 size={16} /> {selectedExam.duration} minutes</span></div>
          <div className="demo-instruction-actions">
            <button type="button" className="hero-btn demo-back-button" onClick={returnToDashboard}><ArrowLeft size={15} /> Back to demo</button>
            <button type="button" className="hero-btn demo-start-button" onClick={() => { setCurrentQuestion(0); setView('test') }}>Start demo exam <ArrowRight size={15} /></button>
          </div>
        </section>
      </div>
    )
  }

  if (view === 'result') {
    return (
      <div className="home-container demo-content">
        <section className="home-extra-section demo-result-card">
          <span className="demo-result-icon"><Check size={25} /></span>
          <span className="demo-home-eyebrow">DEMO SESSION COMPLETE</span>
          <h1>Practice result</h1>
          <strong className="demo-score">{resultScore}<span> / {selectedExam.questions.length}</span></strong>
          <p>Your result is only held in this demo session and is not saved to a real account.</p>
          <div className="demo-instruction-actions">
            <button type="button" className="hero-btn demo-back-button" onClick={() => setView('review')}>Review answers</button>
            <button type="button" className="hero-btn demo-start-button" onClick={returnToDashboard}>Back to demo home <ArrowRight size={15} /></button>
          </div>
        </section>
      </div>
    )
  }

  if (view === 'review') {
    return (
      <div className="home-container demo-content">
        <div className="section-header"><div><h3>Answer Review</h3><span className="demo-section-subtitle">{selectedExam.title} · Demo only</span></div></div>
        <div className="demo-review-list">
          {selectedExam.questions.map((reviewQuestion, index) => {
            const userAnswer = answers[index]
            const isCorrect = userAnswer === reviewQuestion.answer
            return (
              <article className="home-extra-section demo-review-item" key={reviewQuestion.id}>
                <h4>{index + 1}. {reviewQuestion.question}</h4>
                <p className={isCorrect ? 'correct' : 'incorrect'}>{userAnswer === null ? 'Not answered' : `Your answer: ${reviewQuestion.options[userAnswer]}`}</p>
                <p>Correct answer: {reviewQuestion.options[reviewQuestion.answer]}</p>
                {reviewQuestion.explanation && <small>{reviewQuestion.explanation}</small>}
              </article>
            )
          })}
        </div>
        <button type="button" className="hero-btn demo-back-button" onClick={() => setView('result')}>Back to result</button>
      </div>
    )
  }

  return <div className="home-container demo-content">{renderDashboard()}</div>
}
