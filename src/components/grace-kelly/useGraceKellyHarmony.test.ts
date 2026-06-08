import { describe, expect, test, vi } from 'vitest'
import { createMockToneEngine } from '@/composables/toneEngine.mock'
import { useGraceKellyHarmony } from './useGraceKellyHarmony'
import { VOZ_MELODIES } from './graceKellyMelodies'

/* C3 — an arbitrary in-range start tone for the scheduling assertions. */
const START_TONE_MIDI = 48
const BPM = 120

/* Number of audio triggers a single voice produces = note runs after tied
 * same-pitch notes are merged into one sustained tone. */
function expectedRunCount(vozIndex: number): number {
  const notes = VOZ_MELODIES[vozIndex].notes
  let runs = 0
  let index = 0
  while (index < notes.length) {
    let last = index
    while (notes[last].tie && last + 1 < notes.length) last++
    runs++
    index = last + 1
  }

  return runs
}

describe('useGraceKellyHarmony', () => {
  test('start() sizes the voice pool to the selected part count', async () => {
    const setHarmonyVoiceCount = vi.fn()
    const game = useGraceKellyHarmony({
      toneEngine: createMockToneEngine({
        setHarmonyVoiceCount,
        scheduleDraw: vi.fn(),
      }),
    })

    const selected = [0, 2, 5]
    await game.start(START_TONE_MIDI, selected, BPM)

    expect(setHarmonyVoiceCount).toHaveBeenCalledTimes(1)
    expect(setHarmonyVoiceCount).toHaveBeenCalledWith(selected.length)
  })

  test('routes each part to its own voice slot, all six parts', async () => {
    const playHarmonyVoiceAt = vi.fn()
    const game = useGraceKellyHarmony({
      toneEngine: createMockToneEngine({
        playHarmonyVoiceAt,
        scheduleDraw: vi.fn(),
      }),
    })

    const selected = [0, 1, 2, 3, 4, 5]
    await game.start(START_TONE_MIDI, selected, BPM)

    /* One scheduled run per voice slot 0..5; total equals the sum of each
     * melody's merged-run count. */
    const expectedTotal = selected.reduce(
      (sum, vozIndex) => sum + expectedRunCount(vozIndex),
      0,
    )
    expect(playHarmonyVoiceAt).toHaveBeenCalledTimes(expectedTotal)

    const voiceSlots = new Set(
      playHarmonyVoiceAt.mock.calls.map((call) => call[0]),
    )
    expect([...voiceSlots].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5])
  })

  test('schedules each voice at non-decreasing audio-clock times', async () => {
    const playHarmonyVoiceAt = vi.fn()
    const game = useGraceKellyHarmony({
      toneEngine: createMockToneEngine({
        playHarmonyVoiceAt,
        scheduleDraw: vi.fn(),
      }),
    })

    await game.start(START_TONE_MIDI, [0], BPM)

    /* call = [voiceSlot, freq, durationS, whenS]; a single line's notes must be
     * scheduled in order. */
    const times = playHarmonyVoiceAt.mock.calls.map((call) => call[3])
    expect(times.length).toBeGreaterThan(0)
    for (let index = 1; index < times.length; index++) {
      expect(times[index]).toBeGreaterThanOrEqual(times[index - 1])
    }
    for (const call of playHarmonyVoiceAt.mock.calls) {
      expect(call[0]).toBe(0)
    }
  })

  test('empty selection schedules nothing', async () => {
    const setHarmonyVoiceCount = vi.fn()
    const playHarmonyVoiceAt = vi.fn()
    const game = useGraceKellyHarmony({
      toneEngine: createMockToneEngine({
        setHarmonyVoiceCount,
        playHarmonyVoiceAt,
        scheduleDraw: vi.fn(),
      }),
    })

    await game.start(START_TONE_MIDI, [], BPM)

    expect(setHarmonyVoiceCount).not.toHaveBeenCalled()
    expect(playHarmonyVoiceAt).not.toHaveBeenCalled()
  })
})
