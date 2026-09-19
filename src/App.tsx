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
import PracticeHistory from './pages/PracticeHistory'
import Review from './pages/Review'
import AdminDashboard from './pages/AdminDashboard'
import TestInstructions from './pages/TestInstructions'
import GeneralKnowledge from './pages/GeneralKnowledge'
import type { TestConfigType } from './types'

function App() {
  const [page, setPage] = useState('home')
  const [selectedExam, setSelectedExam] = useState<any>(null) // now OBJECT not string
  const [testConfig, setTestConfig] = useState<TestConfigType>({
    examType: 'JAMB',
    examId: '',
    examTitle: '',
    subjects: [],
    totalQuestions: 0,
    year: '2024',
    duration: 120,
    mode: 'exam',
    difficulty: 'General',
    showAnswers: false,
    topic: 'All Topics'
  } as any)

  const hideNavbarPages = ['subjects', 'testConfig', 'testInstructions', 'test', 'result', 'review', 'admin', 'generalKnowledge']
  const AdminAny = AdminDashboard as any

  const renderPage = () => {
    switch(page) {
      case 'home':
        return <Home setActivePage={setPage} setSelectedExam={setSelectedExam} setTestConfig={setTestConfig} />
      case 'exams':
  return <Exams setActivePage={setPage} setSelectedExam={setSelectedExam} setTestConfig={setTestConfig} />
      case 'subjects':
        return <Subjects setActivePage={setPage} setTestConfig={setTestConfig} selectedExam={selectedExam} />
      case 'testConfig':
        return <TestConfig setActivePage={setPage} testConfig={testConfig} setTestConfig={setTestConfig} selectedExam={selectedExam} />
      case 'testInstructions':
        return <TestInstructions setActivePage={setPage} testConfig={testConfig} />
      case 'test':
        return <Test setActivePage={setPage} testConfig={testConfig} />
      case 'result':
        return <Result setActivePage={setPage} />
      case 'review':
        return <Review setActivePage={setPage} />
      case 'classroom':
        return <Study setActivePage={setPage} selectedExam={selectedExam} setTestConfig={setTestConfig} />
      case 'account':
        return <Account setActivePage={setPage} />
      case 'practiceHistory':
        return <PracticeHistory setActivePage={setPage} />
      case 'generalKnowledge':
        return <GeneralKnowledge setActivePage={setPage} setTestConfig={setTestConfig} />
      case 'admin':
        return <AdminAny setActivePage={setPage} />
      default:
        return <Home setActivePage={setPage} setSelectedExam={setSelectedExam} setTestConfig={setTestConfig} />
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