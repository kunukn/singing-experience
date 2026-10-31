import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { effectScope, ref } from 'vue'
import { SONGS, sungMidiRange, tonicMidiForRange } from './singTheKeysSongs'
import { TUNING_HOLD_MS } from '@/utils/tuningHold'
import { useSongTuning } from './useSongTuning'

function setup(sungMidi: number | null) {
  const midi = ref<number | null>(sungMidi)
  const onTuned = vi.fn()
  const scope = effectScope()
  const tuning = scope.run(() =>
    useSongTuning({ sungMidi: midi, song: SONGS.maryLamb, onTuned }),
  )!

  return { midi, onTuned, tuning, scope }
}

describe('useSongTuning', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  test('should move the song so its lowest note is the held one', () => {
    const { onTuned, tuning, scope } = setup(57) // A3

    tuning.start()
    vi.advanceTimersByTime(TUNING_HOLD_MS + 200)

    expect(onTuned).toHaveBeenCalledTimes(1)
    const offset = onTuned.mock.calls[0][0]
    const song = SONGS.maryLamb
    expect(
      sungMidiRange(song, tonicMidiForRange(song, offset)).lowestMidi,
    ).toBe(57)
    expect(tuning.isTuning.value).toBe(false)
    expect(tuning.lastReach.value).toBe('exact')
    scope.stop()
  })

  test('should report a note below the picker as too low', () => {
    const { tuning, scope } = setup(30)

    tuning.start()
    vi.advanceTimersByTime(TUNING_HOLD_MS + 200)

    expect(tuning.lastReach.value).toBe('tooLow')
    scope.stop()
  })

  test('should not tune after cancel', () => {
    const { onTuned, tuning, scope } = setup(57)

    tuning.start()
    vi.advanceTimersByTime(500)
    tuning.cancel()
    vi.advanceTimersByTime(TUNING_HOLD_MS)

    expect(onTuned).not.toHaveBeenCalled()
    expect(tuning.isTuning.value).toBe(false)
    expect(tuning.progress.value).toBe(0)
    scope.stop()
  })
})
