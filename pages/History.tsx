type Props = { setActivePage: (page: string) => void }

import './History.css'

export default function History({ setActivePage }: Props) {
  // In real app, get this from localStorage or DB
  const history = [
    { id: 1, exam: 'JAMB', score: '42/50', date: 'Aug 28, 2026', percentage: 84 },
    { id: 2, exam: 'WAEC', score: '35/50', date: 'Aug 25, 2026', percentage: 70 },
  ]

  return (
    <div className="history-page">
      <div className="history-header">
        <button className="back-btn" onClick={() => setActivePage('home')}>←</button>
        <h1>Test History</h1>
      </div>

      <div className="history-list">
        {history.map(h => (
          <div key={h.id} className="history-card">
            <div className="history-left">
              <h3>{h.exam}</h3>
              <p>{h.date}</p>
            </div>
            <div className="history-right">
              <div className="score">{h.score}</div>
              <div className="percent">{h.percentage}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}