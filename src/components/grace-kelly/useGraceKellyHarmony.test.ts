import { afterEach, describe, expect, test, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import { createMockToneEngine } from '@/composables/toneEngine.mock'
import { useGraceKellyHarmony } from './useGraceKellyHarmony'

/* useMachine starts its actor in onMounted, so the composable runs inside a
 * mounted component (same setup as useDoReMiGame.test.ts). */
const wrappers: { unmount: () => void }[] = []

function mountHarmony(options: Parameters<typeof useGraceKellyHarmony>[0]) {
  let api!: ReturnType<typeof useGraceKellyHarmony>
  const wrapper = mount({
    setup() {
      api = useGraceKellyHarmony(options)
      return () => h('div')
    },
  })
  wrappers.push(wrapper)

  return api
}

afterEach(() => {
  while (wrappers.length) wrappers.pop()!.unmount()
})

/* C3 — an arbitrary in-range start tone for the scheduling assertions. */
const START_TONE_MIDI = 48
const BPM = 120

/* Audio triggers one part produces: its 34 notes, with the last two tied into
 * one sustained tone. */
const RUNS_PER_PART = 33
/* An eighth note at 120 BPM: the beat is a dotted quarter (60 / 120 s), three
 * eighths long. */
const EIGHTH_S = 0.5 / 3

/* One playHarmonyVoiceAt call, in argument order. */
type VoiceCall = [
  voiceSlot: number,
  frequency: number,
  durationS: number,
  whenS: number,
]

describe('useGraceKellyHarmony', () => {
  test('start() sizes the voice pool to the selected part count', async () => {
    const setHarmonyVoiceCount = vi.fn()
    const game = mountHarmony({
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

  test('should route each selected part to its own voice slot', async () => {
    const playHarmonyVoiceAt = vi.fn()
    const game = mountHarmony({
      toneEngine: createMockToneEngine({
        playHarmonyVoiceAt,
        scheduleDraw: vi.fn(),
      }),
    })

    /* Parts that are not next to each other, so a slot (0, 1, 2) can't be
     * mistaken for the part's own index (0, 2, 5). */
    await game.start(START_TONE_MIDI, [0, 2, 5], BPM)

    const calls = playHarmonyVoiceAt.mock.calls as VoiceCall[]
    expect(calls).toHaveLength(3 * RUNS_PER_PART)

    const callsOfSlot = (slot: number) =>
      calls.filter(([voiceSlot]) => voiceSlot === slot)
    expect(callsOfSlot(0)).toHaveLength(RUNS_PER_PART)
    expect(callsOfSlot(1)).toHaveLength(RUNS_PER_PART)
    expect(callsOfSlot(2)).toHaveLength(RUNS_PER_PART)

    /* Each slot opens on its own part's first tone, from the C3 start tone:
     * the melody on C4, part 3 on C5, the low part on C3. */
    expect(callsOfSlot(0)[0][1]).toBeCloseTo(261.63, 1)
    expect(callsOfSlot(1)[0][1]).toBeCloseTo(523.25, 1)
    expect(callsOfSlot(2)[0][1]).toBeCloseTo(130.81, 1)
  })

  test('should schedule a part note after note, each for its written length', async () => {
    const playHarmonyVoiceAt = vi.fn()
    const game = mountHarmony({
      toneEngine: createMockToneEngine({
        playHarmonyVoiceAt,
        scheduleDraw: vi.fn(),
      }),
    })

    await game.start(START_TONE_MIDI, [0], BPM)

    const calls = playHarmonyVoiceAt.mock.calls as VoiceCall[]
    const times = calls.map(([, , , whenS]) => whenS)
    const durations = calls.map(([, , durationS]) => durationS)

    expect(calls).toHaveLength(RUNS_PER_PART)
    for (let index = 1; index < times.length; index++) {
      expect(times[index]).toBeGreaterThan(times[index - 1])
    }

    /* The melody opens with three eighths on C4, then a dotted quarter on E4. */
    expect(times[1] - times[0]).toBeCloseTo(EIGHTH_S, 6)
    expect(times[4] - times[3]).toBeCloseTo(3 * EIGHTH_S, 6)
    expect(calls[0][1]).toBeCloseTo(261.63, 1)
    expect(calls[3][1]).toBeCloseTo(329.63, 1)

    /* A note sounds for most of its length and stops before the next one. */
    expect(durations[0]).toBeGreaterThan(EIGHTH_S / 2)
    expect(durations[0]).toBeLessThan(EIGHTH_S)
    expect(durations[3]).toBeCloseTo(3 * durations[0], 6)
    /* The closing two tied eighths sound as one tone of both lengths. */
    expect(durations.at(-1)).toBeCloseTo(2 * durations[0], 6)
  })

  test('empty selection schedules nothing', async () => {
    const setHarmonyVoiceCount = vi.fn()
    const playHarmonyVoiceAt = vi.fn()
    const game = mountHarmony({
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
