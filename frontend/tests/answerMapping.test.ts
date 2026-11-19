import assert from 'node:assert/strict'
import test from 'node:test'
import { answerLetter, toAnswerIndex } from '../src/answerUtils.ts'

function optionStyles(userAnswer: number, correctAnswer: number, total: number) {
  const hasCorrect = correctAnswer >= 0 && correctAnswer < total
  const hasUser = userAnswer >= 0 && userAnswer < total
  return Array.from({ length: total }, (_, index) => ({
    correct: hasCorrect && index === correctAnswer,
    wrong: hasUser && index === userAnswer && index !== correctAnswer,
  }))
}

test('maps stored letters and indexes without defaulting missing answers to A', () => {
  assert.equal(toAnswerIndex('A'), 0)
  assert.equal(toAnswerIndex('B'), 1)
  assert.equal(toAnswerIndex('C'), 2)
  assert.equal(toAnswerIndex('D'), 3)
  assert.equal(toAnswerIndex('  d '), 3)
  assert.equal(toAnswerIndex('invalid'), -1)
  assert.equal(toAnswerIndex(undefined), -1)
  assert.equal(toAnswerIndex(null), -1)
  assert.equal(answerLetter(1), 'B')
  assert.equal(answerLetter(-1), '')
})

test('highlights the stored correct option instead of option A', () => {
  const wrongSelection = optionStyles(0, 1, 4)
  assert.deepEqual(wrongSelection, [
    { correct: false, wrong: true },
    { correct: true, wrong: false },
    { correct: false, wrong: false },
    { correct: false, wrong: false },
  ])

  const correctSelection = optionStyles(2, 2, 4)
  assert.deepEqual(correctSelection, [
    { correct: false, wrong: false },
    { correct: false, wrong: false },
    { correct: true, wrong: false },
    { correct: false, wrong: false },
  ])

  const unavailable = optionStyles(0, -1, 4)
  assert.equal(unavailable.some(option => option.correct), false)
})
