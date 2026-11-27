import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'
import { buildMajorScale, C3_MIDI } from '@/utils/noteUtils'
import { createMockToneEngine } from '@/composables/toneEngine.mock'
import {
  useDoReMiPlaySequence,
  LEAD_IN_S,
  NOTE_INTERVAL_MS,
} from './useDoReMiPlaySequence'

const LEAD_IN_MS = LEAD_IN_S * 1000

/* One playToneAt call, in argument order. */
type ToneCall = [frequency: number, durationS: number, whenS: number]

describe('useDoReMiPlaySequence', () => {
  const scaleSteps = buildMajorScale(C3_MIDI)

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('should start with idle state', () => {
    const { isPlayingSequence, currentPlayingIndex } = useDoReMiPlaySequence({
      toneEngine: createMockToneEngine(),
    })

    expect(isPlayingSequence.value).toBe(false)
    expect(currentPlayingIndex.value).toBe(-1)
  })

  test('should set isPlayingSequence to true when playing', async () => {
    const { isPlayingSequence, playSequence } = useDoReMiPlaySequence({
      toneEngine: createMockToneEngine(),
    })

    await playSequence(scaleSteps)

    expect(isPlayingSequence.value).toBe(true)
  })

  test('should play the scale from C3 up to C4, one note per interval', async () => {
    const mockPlayToneAt = vi.fn()
    const { playSequence } = useDoReMiPlaySequence({
      toneEngine: createMockToneEngine({ playToneAt: mockPlayToneAt }),
    })

    await playSequence(scaleSteps)

    const calls = mockPlayToneAt.mock.calls as ToneCall[]
    const intervalS = NOTE_INTERVAL_MS / 1000

    /* Do re mi fa sol la ti do: C3 (130.81 Hz) up to C4 (261.63 Hz) */
    expect(calls).toHaveLength(8)
    expect(calls[0][0]).toBeCloseTo(130.81, 1)
    expect(calls[7][0]).toBeCloseTo(261.63, 1)

    /* The first note waits for the lead-in, so its start is not clipped */
    expect(calls[0][2]).toBeGreaterThan(0)

    for (let index = 1; index < calls.length; index++) {
      const [frequency, , whenS] = calls[index]
      const [previousFrequency, , previousWhenS] = calls[index - 1]

      expect(frequency).toBeGreaterThan(previousFrequency)
      expect(whenS - previousWhenS).toBeCloseTo(intervalS, 6)
    }

    /* A note sounds for most of its interval and stops before the next one */
    for (const [, durationS] of calls) {
      expect(durationS).toBeGreaterThan(intervalS / 2)
      expect(durationS).toBeLessThan(intervalS)
    }
  })

  test('should track currentPlayingIndex as steps play', async () => {
    const { currentPlayingIndex, playSequence } = useDoReMiPlaySequence({
      toneEngine: createMockToneEngine(),
    })

    await playSequence(scaleSteps)

    await vi.advanceTimersByTimeAsync(LEAD_IN_MS)
    expect(currentPlayingIndex.value).toBe(0)

    await vi.advanceTimersByTimeAsync(NOTE_INTERVAL_MS)
    expect(currentPlayingIndex.value).toBe(1)

    await vi.advanceTimersByTimeAsync(NOTE_INTERVAL_MS)
    expect(currentPlayingIndex.value).toBe(2)
  })

  test('should reset state after last step completes', async () => {
    const { isPlayingSequence, currentPlayingIndex, playSequence } =
      useDoReMiPlaySequence({
        toneEngine: createMockToneEngine(),
      })

    await playSequence(scaleSteps)

    const totalTime = LEAD_IN_MS + scaleSteps.length * NOTE_INTERVAL_MS
    await vi.advanceTimersByTimeAsync(totalTime)

    expect(isPlayingSequence.value).toBe(false)
    expect(currentPlayingIndex.value).toBe(-1)
  })

  test('should cancel pending draws on stopSequence()', async () => {
    const mockCancelScheduled = vi.fn()
    const {
      isPlayingSequence,
      currentPlayingIndex,
      playSequence,
      stopSequence,
    } = useDoReMiPlaySequence({
      toneEngine: createMockToneEngine({
        cancelScheduled: mockCancelScheduled,
      }),
    })

    await playSequence(scaleSteps)
    await vi.advanceTimersByTimeAsync(LEAD_IN_MS + NOTE_INTERVAL_MS)

    stopSequence()

    expect(mockCancelScheduled).toHaveBeenCalled()
    expect(isPlayingSequence.value).toBe(false)
    expect(currentPlayingIndex.value).toBe(-1)
  })

  test('should play at custom intervalMs when provided', async () => {
    const mockPlayToneAt = vi.fn()
    const customInterval = 150
    const { currentPlayingIndex, playSequence } = useDoReMiPlaySequence({
      toneEngine: createMockToneEngine({ playToneAt: mockPlayToneAt }),
    })

    await playSequence(scaleSteps, customInterval)

    expect(mockPlayToneAt).toHaveBeenCalledTimes(scaleSteps.length)

    await vi.advanceTimersByTimeAsync(LEAD_IN_MS)
    expect(currentPlayingIndex.value).toBe(0)

    await vi.advanceTimersByTimeAsync(customInterval)
    expect(currentPlayingIndex.value).toBe(1)

    await vi.advanceTimersByTimeAsync(customInterval)
    expect(currentPlayingIndex.value).toBe(2)
  })

  test('should stop previous sequence when playSequence is called while playing', async () => {
    const mockPlayToneAt = vi.fn()
    const { currentPlayingIndex, playSequence } = useDoReMiPlaySequence({
      toneEngine: createMockToneEngine({ playToneAt: mockPlayToneAt }),
    })

    await playSequence(scaleSteps)
    await vi.advanceTimersByTimeAsync(LEAD_IN_MS + NOTE_INTERVAL_MS * 2)

    mockPlayToneAt.mockClear()
    await playSequence(scaleSteps)

    expect(mockPlayToneAt).toHaveBeenCalledTimes(scaleSteps.length)

    await vi.advanceTimersByTimeAsync(LEAD_IN_MS)
    expect(currentPlayingIndex.value).toBe(0)
  })
})
