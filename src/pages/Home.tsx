
type Props = {
  setActivePage: (page: string) => void
  setSelectedExam: (exam: string) => void
}

import { useState } from 'react'
import './Home.css'

export default function Home({ setActivePage, setSelectedExam }: Props) {
  const [name] = useState('Lawrence')
  const [examsPracticed] = useState(0)

  const exams = [
    { id: 'JAMB', title: 'JAMB (UTME)', desc: 'Objective only', icon: '📘', color: '#1E90FF', },
    { id: 'POST UTME', title: 'POST UTME', desc: 'Objective only', icon: '📙', color: '#e85906' },
    { id: 'WAEC', title: 'WAEC', desc: 'Objective only', icon: '📗', color: '#10b962' },
    { id: 'NECO', title: 'NECO', desc: 'Objective only', icon: '📕', color: '#e01071' },
  ]

  const handleExamClick = (examId: string) => {
    setSelectedExam(examId) // 1. Save which exam was clicked
    setActivePage('subjects') // 2. Go straight to Subjects page
  }

  return (
    <div className="home-page">
      <p className="greeting">Hello,</p>
      <h1 className="home-title">{name}</h1>

      {/* Stats Card */}
      <div className="stats-card" >
        <h2>{examsPracticed}</h2>
        <p>Exams Practiced</p>
        <button
          className="btn-white"
          onClick={() => alert('History page coming next')}
        >
          VIEW HISTORY
        </button>
      </div>

      {/* Featured Exams */}
     <div className="more-btn">
       <h3 className="section-title1">Featured Exams</h3> 
          <p 
            className="para-btn" 
            onClick={() => setActivePage('exams')} // <- ADDED THIS
            role="button"
            tabIndex={0}
          >
            see more ›
          </p>
     </div>
      <div className="exam-list">
        {exams.map((exam) => (
          <div
            key={exam.id}
            className="exam-row" style={{background: `${exam.color}20`, color: exam.color}}
            onClick={() => handleExamClick(exam.id)}
            role="button"
            tabIndex={0}
          >
            
            <div className="exam-row-left" >
              <span className="exam-icon">{exam.icon}</span>
              <div>
                <h4>{exam.title}</h4>
                <p>{exam.desc}</p>
              </div>
            </div>
            <span className="chevron">›</span>
          </div>
        ))}
      </div>
    </div>
  )
}
