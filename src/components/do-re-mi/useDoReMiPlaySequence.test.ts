import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'
import { buildMajorScale, C3_MIDI, noteToFrequency } from '@/utils/noteUtils'
import { createMockToneEngine } from '@/composables/toneEngine.mock'
import {
  useDoReMiPlaySequence,
  NOTE_INTERVAL_MS,
} from './useDoReMiPlaySequence'

/* Mirror the LEAD_IN_S constant in useDoReMiPlaySequence (50 ms). */
const LEAD_IN_MS = 50

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

  test('should call playToneAt with correct frequencies for every step', async () => {
    const mockPlayToneAt = vi.fn()
    const { playSequence } = useDoReMiPlaySequence({
      toneEngine: createMockToneEngine({ playToneAt: mockPlayToneAt }),
    })

    await playSequence(scaleSteps)

    expect(mockPlayToneAt).toHaveBeenCalledTimes(scaleSteps.length)

    for (let i = 0; i < scaleSteps.length; i++) {
      const expectedFreq = noteToFrequency(
        scaleSteps[i].note,
        scaleSteps[i].octave,
      )
      expect(mockPlayToneAt).toHaveBeenNthCalledWith(
        i + 1,
        expectedFreq,
        (NOTE_INTERVAL_MS - 20) / 1000,
        expect.any(Number),
      )
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
