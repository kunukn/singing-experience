import { describe, expect, test } from 'vitest'

import {
  animationProgress,
  currentStreak,
  easeOutBack,
  easeOutCubic,
  starRating,
} from './noteRushEffects'
import type { GameTarget } from './useNoteRush'

const createTarget = (overrides: Partial<GameTarget>): GameTarget => ({
  id: 0,
  midi: 60,
  dueTime: 0,
  status: 'pending',
  resolvedAt: null,
  streak: 0,
  ...overrides,
})

describe('noteRushEffects', () => {
  test.each([
    { score: 0, total: 6, stars: 0 },
    { score: 1, total: 6, stars: 1 },
    { score: 3, total: 6, stars: 1 },
    { score: 4, total: 6, stars: 2 },
    { score: 5, total: 6, stars: 2 },
    { score: 6, total: 6, stars: 3 },
    { score: 0, total: 0, stars: 0 },
  ])(
    'should give $stars stars for $score of $total',
    ({ score, total, stars }) => {
      expect(starRating(score, total)).toBe(stars)
    },
  )

  test('should clamp animation progress to 0–1', () => {
    expect(animationProgress(-50, 400)).toBe(0)
    expect(animationProgress(100, 400)).toBe(0.25)
    expect(animationProgress(900, 400)).toBe(1)
    expect(animationProgress(Infinity, 400)).toBe(1)
  })

  test('should start the easings at 0 and settle them at 1', () => {
    expect(easeOutCubic(0)).toBe(0)
    expect(easeOutCubic(1)).toBe(1)
    expect(easeOutBack(0)).toBeCloseTo(0)
    expect(easeOutBack(1)).toBeCloseTo(1)
  })

  test('should overshoot on the way to a back-ease settle', () => {
    expect(easeOutBack(0.7)).toBeGreaterThan(1)
  })

  test('should report the streak of the note hit last', () => {
    const targets = [
      createTarget({ id: 0, status: 'hit', resolvedAt: 100, streak: 1 }),
      createTarget({ id: 1, status: 'hit', resolvedAt: 200, streak: 2 }),
      createTarget({ id: 2 }),
    ]

    expect(currentStreak(targets)).toBe(2)
  })

  test('should report no streak after a miss', () => {
    const targets = [
      createTarget({ id: 0, status: 'hit', resolvedAt: 100, streak: 1 }),
      createTarget({ id: 1, status: 'missed', resolvedAt: 200 }),
    ]

    expect(currentStreak(targets)).toBe(0)
  })

  test('should keep the streak when a skipped earlier note expires', () => {
    const targets = [
      createTarget({ id: 0, status: 'missed', resolvedAt: 300 }),
      createTarget({ id: 1, status: 'hit', resolvedAt: 100, streak: 1 }),
      createTarget({ id: 2, status: 'hit', resolvedAt: 200, streak: 2 }),
    ]

    expect(currentStreak(targets)).toBe(2)
  })

  test('should report no streak before any note is resolved', () => {
    expect(currentStreak([createTarget({})])).toBe(0)
  })
})
