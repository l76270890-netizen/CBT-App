import { useState } from 'react'
import Home from './pages/Home'
import Exams from './pages/Exams'
import Subjects from './pages/Subjects'
import TestConfig from './pages/TestConfig'
import Test from './pages/TestPage' 
import Navbar from './components/Navbar'
import Study from './pages/Study' 
import Account from './pages/Account'
import Result from './pages/Result' 

function App() {
  const [page, setPage] = useState('home')
  const [selectedExam, setSelectedExam] = useState('JAMB')
  const [testConfig, setTestConfig] = useState({
    examType: 'JAMB',
    subjects: ['math'], // default subject so test doesn't crash
    totalQuestions: 40,
    year: '2024',
    duration: 40,
    mode: 'exam',
    difficulty: 'Normal',
    showAnswers: false,
    topic: 'All Topics'
  })

  const hideNavbarPages = ['subjects', 'testConfig', 'test', 'result'] // hide navbar on test + result

  const renderPage = () => {
    switch(page) {
      case 'home': 
        return <Home setActivePage={setPage} setSelectedExam={setSelectedExam} />
      case 'exams': 
        return <Exams setActivePage={setPage} setSelectedExam={setSelectedExam} />
      case 'subjects': 
        return <Subjects setActivePage={setPage} setTestConfig={setTestConfig} selectedExam={selectedExam} />
      case 'testConfig': 
        return <TestConfig 
          setActivePage={setPage} 
          testConfig={testConfig} 
          setTestConfig={setTestConfig} 
        />
      case 'test': 
        return <Test setActivePage={setPage} testConfig={testConfig} />
      case 'result':
        return <Result setActivePage={setPage} />
      case 'classroom':
        return <Study
          setActivePage={setPage}
          selectedExam={selectedExam}
          setTestConfig={setTestConfig}
        />
      case 'account': 
        return <Account setActivePage={setPage} />
      default: 
        return <Home setActivePage={setPage} setSelectedExam={setSelectedExam} />
    }
  }

  return (
    <div>
      {!hideNavbarPages.includes(page) && <Navbar activePage={page} setActivePage={setPage} />}
      {renderPage()}
    </div>
  )
}

export default App