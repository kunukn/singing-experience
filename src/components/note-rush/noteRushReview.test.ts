import { describe, expect, test } from 'vitest'

import { HISTORY_WINDOW_MS } from './noteRushConstants'
import { getReviewScrollableMs } from './noteRushReview'
import { LEAD_IN_MS, type GameTarget } from './useNoteRush'

const ROUND_START = 1000

const createTarget = (offsetMs: number): GameTarget => ({
  id: offsetMs,
  midi: 60,
  dueTime: ROUND_START + LEAD_IN_MS + offsetMs,
  status: 'missed',
})

describe('noteRushReview', () => {
  test('returns the round length beyond the visible window', () => {
    const targets = [createTarget(0), createTarget(8000)]

    expect(getReviewScrollableMs(targets, ROUND_START + 20_000)).toBe(
      20_000 - HISTORY_WINDOW_MS,
    )
  })

  test('measures from the earliest target whatever the order', () => {
    const targets = [createTarget(8000), createTarget(0)]

    expect(getReviewScrollableMs(targets, ROUND_START + 12_000)).toBe(
      12_000 - HISTORY_WINDOW_MS,
    )
  })

  test('returns nothing to scroll for a round shorter than the window', () => {
    expect(getReviewScrollableMs([createTarget(0)], ROUND_START + 3000)).toBe(0)
  })

  test('returns nothing to scroll while the chart is live', () => {
    expect(getReviewScrollableMs([createTarget(0)], null)).toBe(0)
  })

  test('returns nothing to scroll without targets', () => {
    expect(getReviewScrollableMs([], ROUND_START + 20_000)).toBe(0)
  })
})
