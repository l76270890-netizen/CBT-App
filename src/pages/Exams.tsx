type Props = { setActivePage: (page: string) => void; setSelectedExam: (exam: string) => void }

import './Exams.css'

export default function Exams({ setActivePage, setSelectedExam }: Props) {
  const exams = [
    { id: 'JAMB', title: 'JAMB UTME', desc: '360 Questions', icon: '📘', color: '#1E90FF' },
    { id: 'POST UTME', title: 'POST UTME', desc: '100 Questions', icon: '📙', color: '#e85906' },
    { id: 'WAEC', title: 'WAEC', desc: 'Objective + Theory', icon: '📗', color: '#10b962' },
    { id: 'NECO', title: 'NECO', desc: 'Objective + Theory', icon: '📕', color: '#e01071' },
  ]

  const handleClick = (id: string) => {
    setSelectedExam(id)
    setActivePage('subjects')
  }

  return (
    <div className="exams-page">
      <div className="exams-header">
        <h1>All Exams</h1>
       <div className="test-type-title">Choose an Examination</div>
       <p className='test-type-title-para'>Pick the exam you want to practice. You can select multiple subjects after.</p>

      </div>
      

       <div className="exams-grid">
        {exams.map(exam => (
          <div 
            key={exam.id} // <-- added key
            className="exam-card"  
            style={{background: `${exam.color}20`, color: exam.color}}
            onClick={() => handleClick(exam.id)} // <-- MADE NAVIGATABLE
          >
              <span className="exam-icon1">{exam.icon}</span>
              <div>
                <h4>{exam.title}</h4>
                <p className='para'>{exam.desc}</p>
              </div>

            </div>
            
        ))}
      </div>
    </div>
  )
}