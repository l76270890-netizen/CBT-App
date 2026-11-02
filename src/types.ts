export type TestMode = "exam" | "practice"

export type SubjectData = {
  subject: string
  questions: number
  years: string
  required?: boolean
  icon?: string
}

export type TestConfigType = {
  examType: string
  subjects: SubjectData[]
  totalQuestions: number
  year: string
  duration: number
  mode: TestMode
  difficulty: string
  showAnswers: boolean
  topic: string
  title?: string
  examTitle?: string
  subject?: string
}

export type Question = {
  id: string
  subject: string
  question: string
  options: string[]
  answer: number
  explanation?: string
}

export type TestResult = {
  id: number
  title: string
  examTitle: string
  subject: string
  date: string
  score: number
  total: number
  duration: string
  status: 'Passed' | 'Failed'
  mode: TestMode
  examType: string
  answers: (number | null)[]
  correctAnswers: number[]
  questions: Question[]
}