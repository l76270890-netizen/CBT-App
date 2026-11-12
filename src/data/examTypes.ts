// The five examination bodies shown on the Home page. Each one lists the
// subjects a student can pick from; picking a subject opens the existing
// Configure Test page with that exam type + subject already selected.
export type ExamTypeKey = 'JAMB' | 'POST-UTME' | 'WAEC' | 'NECO' | 'BECE'

export type ExamTypeInfo = {
  key: ExamTypeKey
  label: string
  fullName: string
  description: string
  subjects: string[]
  /** Default number of questions for a single-subject test. */
  questionsPerSubject: number
  /** Default duration in minutes for a single-subject test. */
  duration: number
  accent: string
  accentSoft: string
}

export const examTypes: ExamTypeInfo[] = [
  {
    key: 'JAMB',
    label: 'JAMB',
    fullName: 'Unified Tertiary Matriculation Examination',
    description: 'UTME practice for university, polytechnic and college admission.',
    subjects: ['Use of English', 'Mathematics', 'Biology', 'Chemistry', 'Physics', 'Government', 'Economics', 'Literature in English', 'CRS', 'Agricultural Science', 'Commerce', 'Financial Accounting'],
    questionsPerSubject: 40,
    duration: 60,
    accent: '#1d4be3',
    accentSoft: '#d6e2fc',
  },
  {
    key: 'POST-UTME',
    label: 'Post-UTME',
    fullName: 'Post UTME Screening',
    description: 'University screening tests taken after the UTME.',
    subjects: ['Use of English', 'Mathematics', 'Biology', 'Chemistry', 'Physics', 'Government', 'Economics', 'Literature in English', 'CRS', 'Commerce'],
    questionsPerSubject: 20,
    duration: 30,
    accent: '#7c3aed',
    accentSoft: '#ede9fe',
  },
  {
    key: 'WAEC',
    label: 'WAEC',
    fullName: 'West African Senior School Certificate Examination',
    description: 'WASSCE practice across science, art and commercial subjects.',
    subjects: ['English Language', 'Mathematics', 'Biology', 'Chemistry', 'Physics', 'Government', 'Economics', 'Literature in English', 'CRS', 'History', 'Agricultural Science', 'Commerce', 'Financial Accounting', 'Business Studies'],
    questionsPerSubject: 40,
    duration: 60,
    accent: '#059669',
    accentSoft: '#d1fae5',
  },
  {
    key: 'NECO',
    label: 'NECO',
    fullName: 'National Examinations Council',
    description: 'SSCE practice built around the NECO syllabus.',
    subjects: ['English Language', 'Mathematics', 'Biology', 'Chemistry', 'Physics', 'Government', 'Economics', 'Literature in English', 'CRS', 'History', 'Agricultural Science', 'Commerce', 'Financial Accounting', 'Business Studies'],
    questionsPerSubject: 40,
    duration: 60,
    accent: '#ea580c',
    accentSoft: '#ffedd5',
  },
  {
    key: 'BECE',
    label: 'BECE',
    fullName: 'Basic Education Certificate Examination',
    description: 'Junior secondary practice for the BECE.',
    subjects: ['English Language', 'Mathematics', 'Basic Science', 'Social Studies', 'Business Studies', 'CRS', 'Agricultural Science'],
    questionsPerSubject: 30,
    duration: 45,
    accent: '#0891b2',
    accentSoft: '#cffafe',
  },
]

export const getExamType = (key: string): ExamTypeInfo | undefined =>
  examTypes.find(exam => exam.key.toLowerCase() === String(key || '').toLowerCase())
