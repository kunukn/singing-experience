import { describe, expect, test } from 'vitest'
import { PAUSE_GAP_MS } from './pitchConstants'
import {
  createFocusTracker,
  DEFAULT_FOCUS_HOLD_MS,
  HEARD_PITCH_WINDOW_MS,
  STATS_HALF_LIFE_MS,
} from './focusToneTracker'

const A3 = 57
const G3 = 55
const C4 = 60

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

    /* 24 frames × 16 ms = 384 ms, just short of the hold time */
    const next = sing(tracker, A3 + 0.2, 0, 384)
    expect(DEFAULT_FOCUS_HOLD_MS).toBe(400)
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

  test('should focus and lock a chosen tone without a hold', () => {
    const tracker = createFocusTracker()

    tracker.lockTo(C4)

    expect(tracker.focusMidi).toBe(C4)
    expect(tracker.isLocked).toBe(true)
  })

  test('should keep a chosen tone while other notes are sung', () => {
    const tracker = createFocusTracker({ holdMs: 100 })

    tracker.lockTo(C4)
    sing(tracker, A3, 0, 1000)

    expect(tracker.focusMidi).toBe(C4)
  })

  test('should follow the voice again once a chosen tone is unlocked', () => {
    const tracker = createFocusTracker({ holdMs: 100 })

    tracker.lockTo(C4)
    tracker.setLocked(false)
    sing(tracker, A3, 0, 200)

    expect(tracker.isLocked).toBe(false)
    expect(tracker.focusMidi).toBe(A3)
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
      onPitchPercent: 0,
      spotOnPercent: 0,
    })
  })

  test('should count a steady +15 cents tone as on pitch but not spot on', () => {
    const tracker = createFocusTracker({ holdMs: 0 })

    sing(tracker, A3 + 0.15, 0, 400)

    expect(tracker.stats.averageCents).toBeCloseTo(15, 5)
    expect(tracker.stats.wobbleCents).toBeCloseTo(0, 5)
    expect(tracker.stats.onPitchPercent).toBe(100)
    expect(tracker.stats.spotOnPercent).toBe(0)
  })

  test('should not count a steady +25 cents tone as on pitch', () => {
    const tracker = createFocusTracker({ holdMs: 0 })

    sing(tracker, A3 + 0.25, 0, 400)

    expect(tracker.stats.onPitchPercent).toBe(0)
  })

  test('should compute average, wobble and both shares over two phrases', () => {
    /* No fading, so both phrases weigh the same and the maths stays exact */
    const tracker = createFocusTracker({ holdMs: 0, statsHalfLifeMs: Infinity })
    tracker.lockTo(A3)

    /* Two equal phrases split by a pause, so neither bleeds into the other:
     * 0 cents then +30 cents → mean 15, sd 15, half on pitch, half spot on */
    const next = sing(tracker, A3, 0, 496)
    sing(tracker, A3 + 0.3, next + PAUSE_GAP_MS, next + PAUSE_GAP_MS + 496)

    expect(tracker.stats.averageCents).toBeCloseTo(15, 5)
    expect(tracker.stats.wobbleCents).toBeCloseTo(15, 5)
    expect(tracker.stats.onPitchPercent).toBe(50)
    expect(tracker.stats.spotOnPercent).toBe(50)
  })

  test('should judge a wide vibrato centred on the note as on pitch', () => {
    const tracker = createFocusTracker({ holdMs: 0 })
    tracker.lockTo(A3)

    /* ±40 cents at 6 Hz, a typical classical vibrato. Frame by frame most of
     * it sits beyond ±20 cents; heard over HEARD_PITCH_WINDOW_MS it is still. */
    const vibratoHz = 6
    for (let timestamp = 0; timestamp <= 3000; timestamp += FRAME_MS) {
      const cents = 40 * Math.sin((2 * Math.PI * vibratoHz * timestamp) / 1000)
      tracker.push(A3 + cents / 100, timestamp)
    }

    expect(HEARD_PITCH_WINDOW_MS).toBe(200)
    expect(tracker.stats.onPitchPercent).toBeGreaterThan(95)
    expect(tracker.stats.spotOnPercent).toBeGreaterThan(90)
    expect(tracker.stats.wobbleCents).toBeLessThan(10)
  })

  test('should hear each phrase fresh after a pause', () => {
    const tracker = createFocusTracker({ holdMs: 0, statsHalfLifeMs: Infinity })
    tracker.lockTo(A3)

    /* +40 cents, a pause, then dead on. Were the +40 tail carried over, the
     * first frames of the second phrase would not count as spot on. */
    const next = sing(tracker, A3 + 0.4, 0, 496)
    sing(tracker, A3, next + PAUSE_GAP_MS + 1, next + PAUSE_GAP_MS + 497)

    expect(tracker.stats.spotOnPercent).toBe(50)
  })

  test('should let a poor start fade once the tone is on pitch', () => {
    const tracker = createFocusTracker({ holdMs: 0 })
    tracker.lockTo(A3)

    /* +30 cents still counts towards the stats but is never on pitch */
    let next = sing(tracker, A3 + 0.3, 0, 10_000)
    next = sing(tracker, A3, next, next + 1000)

    expect(STATS_HALF_LIFE_MS).toBe(1500)
    expect(tracker.stats.onPitchPercent).toBeLessThan(60)

    sing(tracker, A3, next, next + 9000)

    expect(tracker.stats.onPitchPercent).toBeGreaterThan(98)
  })

  test('should drop the on pitch share within a second of drifting sharp', () => {
    const tracker = createFocusTracker({ holdMs: 0 })
    tracker.lockTo(A3)

    const next = sing(tracker, A3, 0, 10_000)
    sing(tracker, A3 + 0.3, next, next + 1000)

    expect(tracker.stats.onPitchPercent).toBeLessThan(75)
  })

  test('should not fade the stats across a pause', () => {
    function singWithPause(pauseMs: number) {
      const tracker = createFocusTracker({ holdMs: 0 })
      tracker.lockTo(A3)
      const next = sing(tracker, A3 + 0.3, 0, 1000)
      tracker.push(null, next)
      sing(tracker, A3, next + pauseMs, next + pauseMs + 500)

      return tracker.stats
    }

    expect(singWithPause(10_000)).toEqual(singWithPause(PAUSE_GAP_MS + 1))
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

  test('should reset stats when a tone is chosen', () => {
    const tracker = createFocusTracker({ holdMs: 0 })
    sing(tracker, A3 + 0.3, 0, 200)

    tracker.lockTo(C4)

    expect(tracker.stats.holdMs).toBe(0)
    expect(tracker.stats.averageCents).toBe(0)
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
