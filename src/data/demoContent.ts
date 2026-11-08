import type { Question } from '../types'

export type DemoExam = {
  id: string
  title: string
  examType: string
  subjects: string[]
  duration: number
  questions: Question[]
}

export const demoExams: DemoExam[] = [
  {
    id: 'demo-jamb-science',
    title: 'JAMB Science Mini Mock',
    examType: 'JAMB',
    subjects: ['Mathematics', 'Biology'],
    duration: 12,
    questions: [
      {
        id: 'demo-jamb-1',
        subject: 'Mathematics',
        question: 'Solve for x: 3x + 5 = 20.',
        options: ['3', '5', '7', '15'],
        answer: 1,
        explanation: 'Subtract 5 from both sides to get 3x = 15, then divide by 3.',
      },
      {
        id: 'demo-jamb-2',
        subject: 'Mathematics',
        question: 'What is 25% of 240?',
        options: ['40', '50', '60', '80'],
        answer: 2,
        explanation: '25% is one quarter, and 240 divided by 4 is 60.',
      },
      {
        id: 'demo-jamb-3',
        subject: 'Biology',
        question: 'Which cell structure is primarily responsible for releasing energy from glucose?',
        options: ['Nucleus', 'Mitochondrion', 'Cell wall', 'Ribosome'],
        answer: 1,
        explanation: 'Mitochondria are the main site of aerobic cellular respiration.',
      },
      {
        id: 'demo-jamb-4',
        subject: 'Biology',
        question: 'Which part of a plant absorbs most water from the soil?',
        options: ['Flower petals', 'Stem bark', 'Root hairs', 'Leaf veins'],
        answer: 2,
        explanation: 'Root hairs provide a large surface area for water absorption.',
      },
    ],
  },
  {
    id: 'demo-waec-english',
    title: 'WAEC English Quick Practice',
    examType: 'WAEC',
    subjects: ['English Language'],
    duration: 8,
    questions: [
      {
        id: 'demo-waec-1',
        subject: 'English Language',
        question: 'Choose the word closest in meaning to “diligent”.',
        options: ['Careless', 'Hardworking', 'Impatient', 'Uncertain'],
        answer: 1,
        explanation: 'A diligent person is careful and hardworking.',
      },
      {
        id: 'demo-waec-2',
        subject: 'English Language',
        question: 'Choose the correct completion: “Neither the teacher nor the students ___ late.”',
        options: ['is', 'was', 'were', 'has'],
        answer: 2,
        explanation: 'With “neither … nor,” the verb agrees with the nearer subject, “students.”',
      },
      {
        id: 'demo-waec-3',
        subject: 'English Language',
        question: 'What is the plural form of “analysis”?',
        options: ['Analysises', 'Analysis', 'Analyses', 'Analysi'],
        answer: 2,
        explanation: 'The plural of “analysis” is “analyses.”',
      },
    ],
  },
]
