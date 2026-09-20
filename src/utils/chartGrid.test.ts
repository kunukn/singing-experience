import { describe, expect, test } from 'vitest'
import { getAdaptiveGridDivisions, getGridMidis } from './chartGrid'

/* Container heights that land in each adaptive-division band. */
const SHORT_CHART = 300
const MEDIUM_CHART = 450
const TALL_CHART = 600

describe('getAdaptiveGridDivisions', () => {
  test.each([
    { height: SHORT_CHART, expected: 4 },
    { height: MEDIUM_CHART, expected: 8 },
    { height: TALL_CHART, expected: 12 },
  ])('returns $expected divisions at $height px', ({ height, expected }) => {
    expect(getAdaptiveGridDivisions(height)).toBe(expected)
  })
})

describe('getGridMidis', () => {
  test('steps evenly when the range divides cleanly', () => {
    /* Mezzo-Soprano A3–A5: 24 semitones over 12 divisions = whole tones */
    expect(getGridMidis(57, 81, TALL_CHART)).toEqual([
      57, 59, 61, 63, 65, 67, 69, 71, 73, 75, 77, 79, 81,
    ])
  })

  test('always ends on the top of the range', () => {
    for (const height of [SHORT_CHART, MEDIUM_CHART, TALL_CHART]) {
      const midis = getGridMidis(40, 84, height)

      expect(midis[0]).toBe(40)
      expect(midis[midis.length - 1]).toBe(84)
    }
  })

  test('replaces the last step rather than crowding the top label', () => {
    /* Choir E2–C6 on a medium chart: 44 semitones over 8 divisions gives a
     * step of 6, which overshoots to 82 and leaves C6 only 2 semitones above
     * it — too close for both labels to fit. */
    const midis = getGridMidis(40, 84, MEDIUM_CHART)

    expect(midis).toEqual([40, 46, 52, 58, 64, 70, 76, 84])
    expect(midis).not.toContain(82)
  })

  test('appends the top label when there is room for it', () => {
    /* 47 semitones over 12 divisions gives a step of 4, stopping at 84 and
     * leaving the boundary 3 semitones clear — enough to fit, so it is added
     * rather than swallowing the step below it. */
    const midis = getGridMidis(40, 87, TALL_CHART)

    expect(midis[midis.length - 2]).toBe(84)
    expect(midis[midis.length - 1]).toBe(87)
  })

  test('never drops below two labels for a one-semitone range', () => {
    expect(getGridMidis(60, 61, SHORT_CHART)).toEqual([60, 61])
  })

  test('leaves no gap smaller than the previous ones', () => {
    /* The regression this guards: a trailing gap far tighter than the step. */
    for (const height of [SHORT_CHART, MEDIUM_CHART, TALL_CHART]) {
      const midis = getGridMidis(40, 84, height)
      const gaps = midis.slice(1).map((midi, index) => midi - midis[index])
      const step = gaps[0]

      expect(Math.min(...gaps)).toBeGreaterThanOrEqual(step * 0.6)
    }
  })
})
