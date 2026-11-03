import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { effectScope, ref } from 'vue'
import { CLOSE_CENTS } from '@/utils/pitchColors'
import { TUNING_STRAY_MS } from '@/utils/tuningHold'
import { RANGE_FINDER_HOLD_MS, useRangeFinder } from './useRangeFinder'

/* A little past the hold, so the last frame lands after it completes */
const HOLD_WITH_SLACK_MS = RANGE_FINDER_HOLD_MS + 100

function setup() {
  const midi = ref<number | null>(null)
  const scope = effectScope()
  const finder = scope.run(() => useRangeFinder({ sungMidi: midi }))!

  return { midi, finder, scope }
}

describe('useRangeFinder', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  test('should keep the lowest held note across several holds', () => {
    const { midi, finder, scope } = setup()

    finder.start()
    midi.value = 45 // A2
    vi.advanceTimersByTime(HOLD_WITH_SLACK_MS)
    midi.value = 43 // G2
    vi.advanceTimersByTime(HOLD_WITH_SLACK_MS)
    midi.value = 48 // C3 — higher, must not replace the record
    vi.advanceTimersByTime(HOLD_WITH_SLACK_MS)

    expect(finder.lowestMidi.value).toBe(43)
    scope.stop()
  })

  test('should not record a note that is not held long enough', () => {
    const { midi, finder, scope } = setup()

    finder.start()
    midi.value = 40
    vi.advanceTimersByTime(RANGE_FINDER_HOLD_MS / 2)
    midi.value = null

    expect(finder.lowestMidi.value).toBe(null)
    scope.stop()
  })

  test('should not reset the hold on a short vibrato blip', () => {
    const { midi, finder, scope } = setup()

    finder.start()
    midi.value = 43
    vi.advanceTimersByTime(RANGE_FINDER_HOLD_MS / 2)
    midi.value = 44 // under TUNING_STRAY_MS, only pauses the hold
    vi.advanceTimersByTime(50)
    midi.value = 43
    vi.advanceTimersByTime(RANGE_FINDER_HOLD_MS / 2 + 100)

    expect(finder.lowestMidi.value).toBe(43)
    scope.stop()
  })

  test('should not fill the hold for a note that cannot beat the record', () => {
    const { midi, finder, scope } = setup()

    finder.start()
    midi.value = 43 // G2 — becomes the record
    vi.advanceTimersByTime(HOLD_WITH_SLACK_MS)
    midi.value = 44 // G♯2 — higher, so no use on the low step
    vi.advanceTimersByTime(RANGE_FINDER_HOLD_MS / 2)

    expect(finder.progress.value).toBe(0)
    expect(finder.lowestMidi.value).toBe(43)
    scope.stop()
  })

  test('should ignore a note below C2', () => {
    const { midi, finder, scope } = setup()

    finder.start()
    midi.value = 35 // B1 — at the detector's floor, and below My range's
    vi.advanceTimersByTime(HOLD_WITH_SLACK_MS)

    expect(finder.progress.value).toBe(0)
    expect(finder.lowestMidi.value).toBe(null)
    scope.stop()
  })

  test('should accept a big leap down past the low record', () => {
    const { midi, finder, scope } = setup()

    finder.start()
    midi.value = 54 // F♯3 — becomes the record
    vi.advanceTimersByTime(HOLD_WITH_SLACK_MS)
    midi.value = 47 // B2, a fifth lower
    vi.advanceTimersByTime(HOLD_WITH_SLACK_MS)

    expect(finder.lowestMidi.value).toBe(47)
    scope.stop()
  })

  test('should accept a big leap up past the high record', () => {
    const { midi, finder, scope } = setup()

    finder.start()
    finder.next()
    midi.value = 60 // C4
    vi.advanceTimersByTime(HOLD_WITH_SLACK_MS)
    midi.value = 72 // C5, an octave higher
    vi.advanceTimersByTime(HOLD_WITH_SLACK_MS)

    expect(finder.highestMidi.value).toBe(72)
    scope.stop()
  })

  test('should report a paused hold as not filling', () => {
    const { midi, finder, scope } = setup()

    finder.start()
    midi.value = 43
    vi.advanceTimersByTime(RANGE_FINDER_HOLD_MS / 2)
    expect(finder.isFilling.value).toBe(true)

    midi.value = null
    vi.advanceTimersByTime(100)

    expect(finder.isFilling.value).toBe(false)
    expect(finder.candidateMidi.value).toBe(43)
    expect(finder.progress.value).toBeGreaterThan(0)
    scope.stop()
  })

  test('should keep the highest in-tune note in the high step', () => {
    const { midi, finder, scope } = setup()

    finder.start()
    finder.next()
    midi.value = 69 // A4
    vi.advanceTimersByTime(HOLD_WITH_SLACK_MS)
    midi.value = 71 // B4
    vi.advanceTimersByTime(HOLD_WITH_SLACK_MS)

    expect(finder.step.value).toBe('high')
    expect(finder.highestMidi.value).toBe(71)
    scope.stop()
  })

  test('should ignore an out-of-tune hold in the high step', () => {
    const { midi, finder, scope } = setup()

    finder.start()
    finder.next()
    midi.value = 72 + (CLOSE_CENTS + 10) / 100
    vi.advanceTimersByTime(HOLD_WITH_SLACK_MS * 2)

    expect(finder.highestMidi.value).toBe(null)
    scope.stop()
  })

  test('should accept an out-of-tune hold in the low step', () => {
    const { midi, finder, scope } = setup()

    finder.start()
    midi.value = 43 + (CLOSE_CENTS + 10) / 100
    vi.advanceTimersByTime(HOLD_WITH_SLACK_MS)

    expect(finder.lowestMidi.value).toBe(43)
    scope.stop()
  })

  test('should stop listening once the result is shown', () => {
    const { midi, finder, scope } = setup()

    finder.start()
    finder.next()
    finder.next()
    midi.value = 80
    vi.advanceTimersByTime(HOLD_WITH_SLACK_MS)

    expect(finder.step.value).toBe('result')
    expect(finder.highestMidi.value).toBe(null)
    scope.stop()
  })

  test('should sing only the high note when asked', () => {
    const { midi, finder, scope } = setup()

    finder.start('high')
    expect(finder.step.value).toBe('high')

    midi.value = 72 // C5
    vi.advanceTimersByTime(HOLD_WITH_SLACK_MS)
    finder.next()

    expect(finder.step.value).toBe('result')
    expect(finder.mode.value).toBe('high')
    expect(finder.highestMidi.value).toBe(72)
    expect(finder.lowestMidi.value).toBe(null)
    scope.stop()
  })

  test('should end after the low step when only the low note is asked', () => {
    const { midi, finder, scope } = setup()

    finder.start('low')
    midi.value = 43
    vi.advanceTimersByTime(HOLD_WITH_SLACK_MS)
    finder.next()

    expect(finder.step.value).toBe('result')
    expect(finder.lowestMidi.value).toBe(43)
    expect(finder.highestMidi.value).toBe(null)
    scope.stop()
  })

  test('should clear earlier records on a fresh start', () => {
    const { midi, finder, scope } = setup()

    finder.start()
    midi.value = 43
    vi.advanceTimersByTime(HOLD_WITH_SLACK_MS)
    finder.cancel()
    finder.start()

    expect(finder.step.value).toBe('low')
    expect(finder.lowestMidi.value).toBe(null)
    scope.stop()
  })

  describe('unbroken hold', () => {
    /* Long enough that the slips alone would fill the hold several times */
    const SLIP_COUNT = 30

    function singWithSlips(
      midi: { value: number | null },
      sungNote: number,
      slipNote: number,
    ) {
      for (let slip = 0; slip < SLIP_COUNT; slip++) {
        midi.value = slipNote
        vi.advanceTimersByTime(100)
        midi.value = sungNote
        vi.advanceTimersByTime(50)
      }
    }

    test('should not build a low record from octave slips', () => {
      const { midi, finder, scope } = setup()

      finder.start()
      midi.value = 44 // G♯2 — becomes the record
      vi.advanceTimersByTime(HOLD_WITH_SLACK_MS)
      singWithSlips(midi, 48, 36) // C3 that now and then reads as C2

      expect(finder.lowestMidi.value).toBe(44)
      scope.stop()
    })

    test('should not build a high record from octave slips', () => {
      const { midi, finder, scope } = setup()

      finder.start('high')
      midi.value = 74 // D5 — becomes the record
      vi.advanceTimersByTime(HOLD_WITH_SLACK_MS)
      singWithSlips(midi, 72, 84) // C5 that now and then reads as C6

      expect(finder.highestMidi.value).toBe(74)
      scope.stop()
    })

    test('should still accept a real leap held to the end', () => {
      const { midi, finder, scope } = setup()

      finder.start()
      midi.value = 44
      vi.advanceTimersByTime(HOLD_WITH_SLACK_MS)
      midi.value = 48
      vi.advanceTimersByTime(500)
      midi.value = 36 // C2
      vi.advanceTimersByTime(HOLD_WITH_SLACK_MS)

      expect(finder.lowestMidi.value).toBe(36)
      scope.stop()
    })

    test('should empty the bar on a note far from the held one', () => {
      const { midi, finder, scope } = setup()

      finder.start()
      midi.value = 44
      vi.advanceTimersByTime(HOLD_WITH_SLACK_MS)
      midi.value = 43
      vi.advanceTimersByTime(RANGE_FINDER_HOLD_MS / 2)
      expect(finder.progress.value).toBeGreaterThan(0)

      midi.value = 48 // Too short for a pause reason, but far off
      vi.advanceTimersByTime(50)

      expect(finder.progress.value).toBe(0)
      scope.stop()
    })

    test('should keep the hold through a vibrato blip onto the record', () => {
      const { midi, finder, scope } = setup()

      finder.start()
      midi.value = 44
      vi.advanceTimersByTime(HOLD_WITH_SLACK_MS)
      midi.value = 43
      vi.advanceTimersByTime(RANGE_FINDER_HOLD_MS / 2)
      midi.value = 44 // Under TUNING_STRAY_MS, and only a semitone off
      vi.advanceTimersByTime(50)
      midi.value = 43
      vi.advanceTimersByTime(RANGE_FINDER_HOLD_MS / 2 + 100)

      expect(finder.lowestMidi.value).toBe(43)
      scope.stop()
    })

    test('should empty the bar once a nearby note has lasted', () => {
      const { midi, finder, scope } = setup()

      finder.start()
      midi.value = 44
      vi.advanceTimersByTime(HOLD_WITH_SLACK_MS)
      midi.value = 43
      vi.advanceTimersByTime(RANGE_FINDER_HOLD_MS / 2)
      midi.value = 44
      vi.advanceTimersByTime(TUNING_STRAY_MS + 50)

      expect(finder.progress.value).toBe(0)
      scope.stop()
    })

    test('should keep the hold through silence', () => {
      const { midi, finder, scope } = setup()

      finder.start()
      midi.value = 44
      vi.advanceTimersByTime(HOLD_WITH_SLACK_MS)
      midi.value = 43
      vi.advanceTimersByTime(RANGE_FINDER_HOLD_MS / 2)
      const progressBefore = finder.progress.value
      midi.value = null
      vi.advanceTimersByTime(500)

      expect(finder.progress.value).toBe(progressBefore)
      scope.stop()
    })

    test('should keep the hold through an out-of-tune high note', () => {
      const { midi, finder, scope } = setup()

      finder.start('high')
      midi.value = 72
      vi.advanceTimersByTime(RANGE_FINDER_HOLD_MS / 2)
      const progressBefore = finder.progress.value
      midi.value = 72 + (CLOSE_CENTS + 10) / 100
      vi.advanceTimersByTime(500)

      expect(finder.pauseReason.value).toBe('offPitch')
      expect(finder.progress.value).toBe(progressBefore)
      scope.stop()
    })
  })

  describe('pause reason', () => {
    /* A little past the delay, so a frame lands after it */
    const CUE_DELAY_WITH_SLACK_MS = TUNING_STRAY_MS + 50
    const OUT_OF_TUNE_CENTS = (CLOSE_CENTS + 10) / 100

    test('should report a note not past the low record only after the delay', () => {
      const { midi, finder, scope } = setup()

      finder.start()
      midi.value = 44 // G♯2 — becomes the record
      vi.advanceTimersByTime(HOLD_WITH_SLACK_MS)
      midi.value = 46 // A♯2 — in tune, but higher
      vi.advanceTimersByTime(50)
      midi.value = 48 // C3 — same reason, so the delay keeps running
      expect(finder.pauseReason.value).toBe(null)

      vi.advanceTimersByTime(CUE_DELAY_WITH_SLACK_MS)

      expect(finder.pauseReason.value).toBe('notPastRecord')
      scope.stop()
    })

    test('should report an out-of-tune note past the high record as off pitch', () => {
      const { midi, finder, scope } = setup()

      finder.start('high')
      midi.value = 72 + OUT_OF_TUNE_CENTS
      vi.advanceTimersByTime(CUE_DELAY_WITH_SLACK_MS)

      expect(finder.pauseReason.value).toBe('offPitch')
      scope.stop()
    })

    test('should put the record before tuning on the high step', () => {
      const { midi, finder, scope } = setup()

      finder.start('high')
      midi.value = 72
      vi.advanceTimersByTime(HOLD_WITH_SLACK_MS)
      midi.value = 69 + OUT_OF_TUNE_CENTS
      vi.advanceTimersByTime(CUE_DELAY_WITH_SLACK_MS)

      expect(finder.pauseReason.value).toBe('notPastRecord')
      scope.stop()
    })

    test('should give no reason for an out-of-tune note filling the low step', () => {
      const { midi, finder, scope } = setup()

      finder.start()
      midi.value = 43 + OUT_OF_TUNE_CENTS
      vi.advanceTimersByTime(CUE_DELAY_WITH_SLACK_MS)

      expect(finder.isFilling.value).toBe(true)
      expect(finder.pauseReason.value).toBe(null)
      scope.stop()
    })

    test('should clear at once when the singer falls silent', () => {
      const { midi, finder, scope } = setup()

      finder.start('high')
      midi.value = 72 + OUT_OF_TUNE_CENTS
      vi.advanceTimersByTime(CUE_DELAY_WITH_SLACK_MS)
      midi.value = null
      vi.advanceTimersByTime(20)

      expect(finder.pauseReason.value).toBe(null)
      scope.stop()
    })

    test('should give no reason for a note outside C2–C7', () => {
      const { midi, finder, scope } = setup()

      finder.start()
      midi.value = 35 // B1
      vi.advanceTimersByTime(CUE_DELAY_WITH_SLACK_MS)

      expect(finder.pauseReason.value).toBe(null)
      scope.stop()
    })

    test('should give no reason once the record is at the end of the span', () => {
      const { midi, finder, scope } = setup()

      finder.start()
      midi.value = 36 // C2 — nothing below it counts
      vi.advanceTimersByTime(HOLD_WITH_SLACK_MS)
      midi.value = 40
      vi.advanceTimersByTime(CUE_DELAY_WITH_SLACK_MS)

      expect(finder.lowestMidi.value).toBe(36)
      expect(finder.pauseReason.value).toBe(null)
      scope.stop()
    })

    test('should clear when moving on to the next step', () => {
      const { midi, finder, scope } = setup()

      finder.start()
      midi.value = 44
      vi.advanceTimersByTime(HOLD_WITH_SLACK_MS)
      midi.value = 46
      vi.advanceTimersByTime(CUE_DELAY_WITH_SLACK_MS)
      finder.next()

      expect(finder.step.value).toBe('high')
      expect(finder.pauseReason.value).toBe(null)
      scope.stop()
    })
  })
})
