import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'
import { buildMajorScale, C3_MIDI, noteToFrequency } from '@/utils/noteUtils'
import { createMockToneEngine } from '@/composables/toneEngine.mock'
import {
  useDoReMiPlaySequence,
  NOTE_INTERVAL_MS,
} from './useDoReMiPlaySequence'

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
    const mockPlayTone = vi.fn().mockResolvedValue(undefined)
    const { isPlayingSequence, playSequence } = useDoReMiPlaySequence({
      toneEngine: createMockToneEngine({ playTone: mockPlayTone }),
    })

    await playSequence(scaleSteps)

    expect(isPlayingSequence.value).toBe(true)
  })

  test('should call playTone with correct frequencies at each interval', async () => {
    const mockPlayTone = vi.fn().mockResolvedValue(undefined)
    const { playSequence } = useDoReMiPlaySequence({
      toneEngine: createMockToneEngine({ playTone: mockPlayTone }),
    })

    await playSequence(scaleSteps)

    for (let i = 0; i < scaleSteps.length; i++) {
      await vi.advanceTimersByTimeAsync(i === 0 ? 0 : NOTE_INTERVAL_MS)
      const expectedFreq = noteToFrequency(
        scaleSteps[i].note,
        scaleSteps[i].octave,
      )
      expect(mockPlayTone).toHaveBeenCalledWith(expectedFreq)
    }

    expect(mockPlayTone).toHaveBeenCalledTimes(scaleSteps.length)
  })

  test('should track currentPlayingIndex as steps play', async () => {
    const mockPlayTone = vi.fn().mockResolvedValue(undefined)
    const { currentPlayingIndex, playSequence } = useDoReMiPlaySequence({
      toneEngine: createMockToneEngine({ playTone: mockPlayTone }),
    })

    await playSequence(scaleSteps)

    await vi.advanceTimersByTimeAsync(0)
    expect(currentPlayingIndex.value).toBe(0)

    await vi.advanceTimersByTimeAsync(NOTE_INTERVAL_MS)
    expect(currentPlayingIndex.value).toBe(1)

    await vi.advanceTimersByTimeAsync(NOTE_INTERVAL_MS)
    expect(currentPlayingIndex.value).toBe(2)
  })

  test('should reset state after last step completes', async () => {
    const mockPlayTone = vi.fn().mockResolvedValue(undefined)
    const { isPlayingSequence, currentPlayingIndex, playSequence } =
      useDoReMiPlaySequence({
        toneEngine: createMockToneEngine({ playTone: mockPlayTone }),
      })

    await playSequence(scaleSteps)

    const totalTime =
      (scaleSteps.length - 1) * NOTE_INTERVAL_MS + NOTE_INTERVAL_MS
    await vi.advanceTimersByTimeAsync(totalTime)

    expect(isPlayingSequence.value).toBe(false)
    expect(currentPlayingIndex.value).toBe(-1)
  })

  test('should clear all pending timers on stopSequence()', async () => {
    const mockPlayTone = vi.fn().mockResolvedValue(undefined)
    const {
      isPlayingSequence,
      currentPlayingIndex,
      playSequence,
      stopSequence,
    } = useDoReMiPlaySequence({
      toneEngine: createMockToneEngine({ playTone: mockPlayTone }),
    })

    await playSequence(scaleSteps)

    await vi.advanceTimersByTimeAsync(NOTE_INTERVAL_MS)
    const callsBeforeStop = mockPlayTone.mock.calls.length

    stopSequence()

    expect(isPlayingSequence.value).toBe(false)
    expect(currentPlayingIndex.value).toBe(-1)

    await vi.advanceTimersByTimeAsync(NOTE_INTERVAL_MS * scaleSteps.length)
    expect(mockPlayTone).toHaveBeenCalledTimes(callsBeforeStop)
  })

  test('should play at custom intervalMs when provided', async () => {
    const mockPlayTone = vi.fn().mockResolvedValue(undefined)
    const customInterval = 150
    const { currentPlayingIndex, playSequence } = useDoReMiPlaySequence({
      toneEngine: createMockToneEngine({ playTone: mockPlayTone }),
    })

    await playSequence(scaleSteps, customInterval)

    await vi.advanceTimersByTimeAsync(0)
    expect(currentPlayingIndex.value).toBe(0)

    await vi.advanceTimersByTimeAsync(customInterval)
    expect(currentPlayingIndex.value).toBe(1)

    await vi.advanceTimersByTimeAsync(customInterval)
    expect(currentPlayingIndex.value).toBe(2)

    expect(mockPlayTone).toHaveBeenCalledTimes(3)
  })

  test('should stop previous sequence when playSequence is called while playing', async () => {
    const mockPlayTone = vi.fn().mockResolvedValue(undefined)
    const { currentPlayingIndex, playSequence } = useDoReMiPlaySequence({
      toneEngine: createMockToneEngine({ playTone: mockPlayTone }),
    })

    await playSequence(scaleSteps)
    await vi.advanceTimersByTimeAsync(NOTE_INTERVAL_MS * 2)

    mockPlayTone.mockClear()
    await playSequence(scaleSteps)

    await vi.advanceTimersByTimeAsync(0)
    expect(currentPlayingIndex.value).toBe(0)
    expect(mockPlayTone).toHaveBeenCalledTimes(1)
  })
})
