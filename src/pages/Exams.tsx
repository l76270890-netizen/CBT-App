type Props = {
  setActivePage: (page: string) => void
  setSelectedExam: (exam: string) => void
}

import './Exams.css'

export default function Exams({ setActivePage, setSelectedExam }: Props) {
  const exams = [
    {
      id: 'JAMB',
      name: 'JAMB (UTME)',
      desc: 'Nigeria Tertiary Institution Exam',
      icon: '🎓',
      color: '#1E90FF',
      subjects: 25,
      years: '2015-2025'
    },
    {
      id: 'WAEC',
      name: 'WAEC (SSCE)',
      desc: 'West African Senior School Certificate',
      icon: '📜',
      color: '#10B981',
      subjects: 30,
      years: '2010-2024'
    },
    {
      id: 'POST UTME',
      name: 'POST UTME',
      desc: 'University Screening Exams',
      icon: '🏛️',
      color: '#F59E0B',
      subjects: 15,
      years: '2020-2025'
    },
  ]

  const handleSelectExam = (examId: string) => {
    setSelectedExam(examId)
    setActivePage('subjects')
  }

  return (
    <div className="exams-page">
      <div className="exams-topbar1">
        <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
          <h1>All Exam</h1>
        </div>
         <div className="test-type-title">Choose an Examination</div>
          <div className="exams-desc1">
          Pick the exam you want to practice. You can select multiple subjects after.
        </div>
      </div>

      <div className="exam-grid">
        {exams.map((exam) => (
          <div 
            key={exam.id}
            className="exam-main-card"
            onClick={() => handleSelectExam(exam.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleSelectExam(exam.id)}
            style={{borderLeft: `4px solid ${exam.color}`}}
          >
            <div className="exam-main-icon" style={{background: `${exam.color}20`, color: exam.color}}>
              {exam.icon}
            </div>
            <div className="exam-main-info">
              <h3>{exam.name}</h3>
              <p>{exam.desc}</p>
              <div className="exam-meta">
                <span>{exam.subjects} Subjects</span> • <span>{exam.years}</span>
              </div>
            </div>
            <div className="chevron1">›</div>
          </div>
        ))}
      </div>
    </div>
  )
}