import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { effectScope, ref } from 'vue'
import { CLOSE_CENTS } from '@/utils/pitchColors'
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
})
