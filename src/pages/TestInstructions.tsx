type Props = {
  setActivePage: (page: string) => void
  testConfig: {
    examType: string
    subjects: any[]
    totalQuestions: number
    duration: number
  }
}

import './TestInstructions.css'

export default function TestInstructions({ setActivePage, testConfig }: Props) {
  const totalMinutes = testConfig.duration
  const totalHours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60

  return (
    <div className="instruction-page">
      {/* HEADER */}
      <div className="instruction-header">
        <button className="back-circle" onClick={() => setActivePage('testConfig')}>←</button>
        <h1>Test Instructions</h1>
        <p>Read carefully before you begin</p>
      </div>

      {/* EXAM INFO CARD */}
      <div className="info-card">
        <h3>Exam Details</h3>
        <div className="info-row">
          <span>Exam:</span>
          <strong>{testConfig.examType}</strong>
        </div>
        <div className="info-row">
          <span>Subjects:</span>
          <strong>{testConfig.subjects.length}</strong>
        </div>
        <div className="info-row">
          <span>Questions:</span>
          <strong>{testConfig.totalQuestions}</strong>
        </div>
        <div className="info-row">
          <span>Duration:</span>
          <strong>{totalHours > 0 ? `${totalHours}h ${mins}m` : `${mins}m`}</strong>
        </div>
      </div>

      {/* INSTRUCTIONS */}
      <div className="instruction-card">
        <h3>General Instructions</h3>
        <ul>
          <li>This test contains <strong>{testConfig.totalQuestions} multiple choice questions</strong>.</li>
          <li>You have <strong>{totalHours > 0 ? `${totalHours} hours ${mins} minutes` : `${mins} minutes`}</strong> to complete the test.</li>
          <li>Each question has <strong>4 options</strong>. Choose the most correct answer.</li>
          <li>You can <strong>go back and forth</strong> between questions using "Previous" and "Next" buttons.</li>
          <li>Use the <strong>grid button</strong> in the middle to jump to any question.</li>
          <li>Questions you answer will be marked in <span className="green-dot"></span> green on the grid.</li>
          <li>Once you click <strong>Submit</strong>, you cannot change your answers.</li>
          <li>Do not refresh or close the app during the test.</li>
        </ul>
      </div>

      {/* WARNING */}
      <div className="warning-card">
        <div className="warning-icon">⚠️</div>
        <div>
          <h4>Important</h4>
          <p>Your test will be submitted automatically when time runs out.</p>
        </div>
      </div>

      {/* CHECKBOX + START */}
      <div className="start-section">
        <button className="start-test-btn" onClick={() => setActivePage('test')}>
          I Understand, Start Test
        </button>
      </div>
    </div>
  )
}