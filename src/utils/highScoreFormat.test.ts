import { describe, expect, test } from 'vitest'

import { formatHighScore } from './highScoreFormat'

describe('formatHighScore', () => {
  test.each([
    {
      name: 'count and time',
      score: { game: 'singTone', correct: 4, total: 5, elapsedMs: 23_400 },
      expected: '4/5 · 23.4s',
    },
    {
      name: 'count only for fixed-length games',
      score: { game: 'singTheKeys', correct: 12, total: 14, elapsedMs: null },
      expected: '12/14',
    },
    {
      name: 'time only for always-correct games',
      score: { game: 'doReMi', correct: 8, total: 8, elapsedMs: 9_050 },
      expected: '9.1s',
    },
  ] as const)('returns $expected for $name', ({ score, expected }) => {
    expect(formatHighScore(score, 'en')).toBe(expected)
  })
})
