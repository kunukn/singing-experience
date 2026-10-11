import { describe, expect, test } from 'vitest'
import { createFocusTracker, DEFAULT_FOCUS_HOLD_MS } from './focusToneTracker'

const A3 = 57
const G3 = 55

/* ~60 fps, the rate usePitchDetection reports at */
const FRAME_MS = 16

/* Pushes one frame every FRAME_MS from startMs until (and including) endMs,
 * returning the timestamp after the last frame. */
function sing(
  tracker: ReturnType<typeof createFocusTracker>,
  midi: number,
  startMs: number,
  endMs: number,
) {
  let timestamp = startMs
  for (; timestamp <= endMs; timestamp += FRAME_MS) {
    tracker.push(midi, timestamp)
  }

  return timestamp
}

describe('createFocusTracker - focus', () => {
  test('should start with no focus', () => {
    const tracker = createFocusTracker()

    expect(tracker.focusMidi).toBe(null)
  })

  test('should focus A3 after holding A3 +20 cents for the hold time', () => {
    const tracker = createFocusTracker()

    /* 31 frames × 16 ms = 496 ms, just short of the hold time */
    const next = sing(tracker, A3 + 0.2, 0, 496)
    expect(DEFAULT_FOCUS_HOLD_MS).toBe(500)
    expect(tracker.focusMidi).toBe(null)

    tracker.push(A3 + 0.2, next)
    expect(tracker.focusMidi).toBe(A3)
  })

  test('should move focus to G3 only once G3 is held for the hold time', () => {
    const tracker = createFocusTracker({ holdMs: 100 })
    const next = sing(tracker, A3, 0, 200)

    tracker.push(G3, next)
    tracker.push(G3, next + 99)
    expect(tracker.focusMidi).toBe(A3)

    tracker.push(G3, next + 100)
    expect(tracker.focusMidi).toBe(G3)
  })

  test('should restart the hold timer when a different note interrupts', () => {
    const tracker = createFocusTracker({ holdMs: 100 })
    const next = sing(tracker, A3, 0, 200)

    tracker.push(G3, next)
    tracker.push(G3, next + 80)
    tracker.push(G3 + 1, next + 90)
    tracker.push(G3, next + 100)
    tracker.push(G3, next + 180)
    expect(tracker.focusMidi).toBe(A3)

    tracker.push(G3, next + 200)
    expect(tracker.focusMidi).toBe(G3)
  })

  test('should keep focus through silence', () => {
    const tracker = createFocusTracker({ holdMs: 100 })
    const next = sing(tracker, A3, 0, 200)

    tracker.push(null, next)
    tracker.push(null, next + 5000)

    expect(tracker.focusMidi).toBe(A3)
  })

  test('should not count a silent gap towards the hold time', () => {
    const tracker = createFocusTracker({ holdMs: 100 })
    const next = sing(tracker, A3, 0, 200)

    tracker.push(G3, next)
    tracker.push(null, next + 10)
    tracker.push(G3, next + 2000)

    expect(tracker.focusMidi).toBe(A3)
  })

  test('should ignore other notes while locked', () => {
    const tracker = createFocusTracker({ holdMs: 100 })
    const next = sing(tracker, A3, 0, 200)

    tracker.setLocked(true)
    sing(tracker, G3, next, next + 1000)

    expect(tracker.isLocked).toBe(true)
    expect(tracker.focusMidi).toBe(A3)
  })

  test('should not lock before there is a focus', () => {
    const tracker = createFocusTracker()

    tracker.setLocked(true)

    expect(tracker.isLocked).toBe(false)
  })

  test('should clear focus and lock on reset', () => {
    const tracker = createFocusTracker({ holdMs: 100 })
    sing(tracker, A3, 0, 200)
    tracker.setLocked(true)

    tracker.reset()

    expect(tracker.focusMidi).toBe(null)
    expect(tracker.isLocked).toBe(false)
  })
})

describe('createFocusTracker - stats', () => {
  test('should report zeroed stats before there is a focus', () => {
    const tracker = createFocusTracker()

    expect(tracker.stats).toEqual({
      holdMs: 0,
      averageCents: 0,
      wobbleCents: 0,
      inTunePercent: 0,
    })
  })

  test('should report a steady sharp tone as sharp with no wobble', () => {
    const tracker = createFocusTracker({ holdMs: 0 })

    tracker.push(A3 + 0.2, 0)
    tracker.push(A3 + 0.2, 10)
    tracker.push(A3 + 0.2, 20)

    expect(tracker.stats.averageCents).toBeCloseTo(20, 5)
    expect(tracker.stats.wobbleCents).toBeCloseTo(0, 5)
    expect(tracker.stats.inTunePercent).toBe(0)
  })

  test('should compute average, wobble and in-tune share', () => {
    const tracker = createFocusTracker({ holdMs: 0 })

    /* Focus lands on the first frame; then −5, +5, +30 cents.
     * Samples: 0, −5, +5, +30 → mean 7.5, population sd √181.25 */
    tracker.push(A3, 0)
    tracker.push(A3 - 0.05, 10)
    tracker.push(A3 + 0.05, 20)
    tracker.push(A3 + 0.3, 30)

    expect(tracker.stats.averageCents).toBeCloseTo(7.5, 5)
    expect(tracker.stats.wobbleCents).toBeCloseTo(Math.sqrt(181.25), 5)
    expect(tracker.stats.inTunePercent).toBe(75)
    expect(tracker.stats.holdMs).toBe(30)
  })

  test('should leave out frames more than 50 cents off the focus', () => {
    const tracker = createFocusTracker({ holdMs: 0 })

    tracker.push(A3, 0)
    /* Locked, so the +60 cents frames cannot pull the focus to A#3 */
    tracker.setLocked(true)
    tracker.push(A3 + 0.6, 10)
    tracker.push(A3 + 0.6, 20)

    expect(tracker.stats.averageCents).toBeCloseTo(0, 5)
    expect(tracker.stats.holdMs).toBe(0)
  })

  test('should not count silent gaps as hold time', () => {
    const tracker = createFocusTracker({ holdMs: 0 })

    tracker.push(A3, 0)
    tracker.push(A3, 100)
    tracker.push(null, 150)
    tracker.push(A3, 3000)
    tracker.push(A3, 3100)

    expect(tracker.stats.holdMs).toBe(200)
  })

  test('should reset stats when the focus moves', () => {
    const tracker = createFocusTracker({ holdMs: 50 })
    let next = sing(tracker, A3 + 0.3, 0, 500)
    next = sing(tracker, G3, next, next + 80)

    expect(tracker.focusMidi).toBe(G3)
    expect(tracker.stats.averageCents).toBeCloseTo(0, 5)
    expect(tracker.stats.holdMs).toBeLessThan(60)
  })
})
