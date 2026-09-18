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
}