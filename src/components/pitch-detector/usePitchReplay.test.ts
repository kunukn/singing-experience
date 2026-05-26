import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { usePitchReplay } from './usePitchReplay'
import type { PitchSample } from './PitchHistoryCanvas.vue'

function createMockSamples(count: number, startMidi = 60): PitchSample[] {
  const baseTimestamp = 1000
  return Array.from({ length: count }, (_, i) => ({
    midiNote: startMidi + (i % 5) * 0.5,
    timestamp: baseTimestamp + i * 50,
    isClean: true,
    cents: 0,
  }))
}

/* Minimal Web Audio API stubs */
function createMockAudioContext() {
  const mockGainParam = {
    setValueAtTime: vi.fn().mockReturnThis(),
    linearRampToValueAtTime: vi.fn().mockReturnThis(),
    value: 0,
  }
  const mockFrequencyParam = {
    setValueAtTime: vi.fn().mockReturnThis(),
    linearRampToValueAtTime: vi.fn().mockReturnThis(),
    value: 440,
  }
  const mockGainNode = {
    gain: mockGainParam,
    connect: vi.fn(),
    disconnect: vi.fn(),
  }
  const mockOscillator = {
    type: 'sine',
    frequency: mockFrequencyParam,
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  }
  const mockCtx = {
    currentTime: 0,
    createGain: vi.fn(() => mockGainNode),
    createOscillator: vi.fn(() => mockOscillator),
    destination: {},
  }

  return { mockCtx, mockOscillator, mockGainNode, mockFrequencyParam }
}

function mockAudioContextGlobal() {
  const mocks = createMockAudioContext()
  globalThis.AudioContext = class {
    currentTime = mocks.mockCtx.currentTime
    destination = mocks.mockCtx.destination
    createGain = mocks.mockCtx.createGain
    createOscillator = mocks.mockCtx.createOscillator
  } as unknown as typeof AudioContext

  return mocks
}

describe('usePitchReplay', () => {
  let originalAudioContext: typeof globalThis.AudioContext

  beforeEach(() => {
    vi.useFakeTimers()
    originalAudioContext = globalThis.AudioContext
  })

  afterEach(() => {
    vi.useRealTimers()
    globalThis.AudioContext = originalAudioContext
  })

  test('should not be replaying initially', () => {
    const { isReplaying } = usePitchReplay()
    expect(isReplaying.value).toBe(false)
  })

  test('should start replaying when given valid samples', () => {
    const { mockOscillator } = mockAudioContextGlobal()

    const { isReplaying, replayPitchHistory } = usePitchReplay()
    const samples = createMockSamples(10)

    replayPitchHistory(samples)

    expect(isReplaying.value).toBe(true)
    expect(mockOscillator.start).toHaveBeenCalledTimes(1)
    expect(mockOscillator.stop).toHaveBeenCalledTimes(1)
  })

  test('should schedule frequency ramps for each clean sample', () => {
    const { mockFrequencyParam } = mockAudioContextGlobal()

    const { replayPitchHistory } = usePitchReplay()
    const samples = createMockSamples(5)

    replayPitchHistory(samples)

    /* 1 initial setValueAtTime + 5 linearRampToValueAtTime calls */
    expect(mockFrequencyParam.setValueAtTime).toHaveBeenCalledTimes(1)
    expect(mockFrequencyParam.linearRampToValueAtTime).toHaveBeenCalledTimes(5)
  })

  test('should skip unclean samples', () => {
    const { mockFrequencyParam } = mockAudioContextGlobal()

    const { isReplaying, replayPitchHistory } = usePitchReplay()
    const samples: PitchSample[] = [
      { midiNote: 60, timestamp: 1000, isClean: false, cents: 0 },
      { midiNote: 62, timestamp: 1050, isClean: false, cents: 0 },
    ]

    replayPitchHistory(samples)

    /* All samples are unclean — nothing should play */
    expect(isReplaying.value).toBe(false)
    expect(mockFrequencyParam.linearRampToValueAtTime).not.toHaveBeenCalled()
  })

  test('should stop replaying and disconnect nodes', () => {
    const { mockOscillator, mockGainNode } = mockAudioContextGlobal()

    const { isReplaying, replayPitchHistory, stopReplay } = usePitchReplay()
    const samples = createMockSamples(10)

    replayPitchHistory(samples)
    expect(isReplaying.value).toBe(true)

    stopReplay()

    expect(isReplaying.value).toBe(false)
    expect(mockOscillator.stop).toHaveBeenCalled()
    expect(mockOscillator.disconnect).toHaveBeenCalled()
    expect(mockGainNode.disconnect).toHaveBeenCalled()
  })

  test('should auto-stop after playback duration elapses', () => {
    mockAudioContextGlobal()

    const { isReplaying, replayPitchHistory } = usePitchReplay()
    const samples = createMockSamples(5)

    replayPitchHistory(samples)
    expect(isReplaying.value).toBe(true)

    /* Total duration: (4 * 50ms) samples + 100ms buffer = 300ms */
    vi.advanceTimersByTime(500)

    expect(isReplaying.value).toBe(false)
  })

  test('should handle empty samples array without error', () => {
    const { isReplaying, replayPitchHistory } = usePitchReplay()

    replayPitchHistory([])

    expect(isReplaying.value).toBe(false)
  })

  test('should stop previous replay when starting a new one', () => {
    const { mockOscillator } = mockAudioContextGlobal()

    const { replayPitchHistory } = usePitchReplay()
    const samples = createMockSamples(5)

    replayPitchHistory(samples)

    /* Reset to track the second call's oscillator */
    const firstStop = mockOscillator.stop.mock.calls.length

    replayPitchHistory(samples)

    /* stopReplay called internally — oscillator.stop called again for cleanup */
    expect(mockOscillator.stop.mock.calls.length).toBeGreaterThan(firstStop)
  })

  test('replayProgress should be null initially', () => {
    const { replayProgress } = usePitchReplay()
    expect(replayProgress.value).toBeNull()
  })

  test('replayProgress should be 0 immediately after starting replay', () => {
    mockAudioContextGlobal()

    const { replayProgress, replayPitchHistory } = usePitchReplay()
    const samples = createMockSamples(10)

    replayPitchHistory(samples)

    expect(replayProgress.value).toBe(0)
  })

  test('should finish in half the time when speed is 2', () => {
    mockAudioContextGlobal()

    const { isReplaying, replayPitchHistory } = usePitchReplay()
    /* 10 samples × 50ms = 450ms span; at 2× scaled to 225ms + 100ms buffer = 325ms total */
    const samples = createMockSamples(10)

    replayPitchHistory(samples, { speed: 2 })
    expect(isReplaying.value).toBe(true)

    /* Halfway through scaled duration — should still be playing */
    vi.advanceTimersByTime(150)
    expect(isReplaying.value).toBe(true)

    /* Past the scaled duration + buffer — should have stopped */
    vi.advanceTimersByTime(300)
    expect(isReplaying.value).toBe(false)
  })

  test('replayProgress should reset to null on stopReplay', () => {
    mockAudioContextGlobal()

    const { replayProgress, replayPitchHistory, stopReplay } = usePitchReplay()
    const samples = createMockSamples(10)

    replayPitchHistory(samples)
    expect(replayProgress.value).toBe(0)

    stopReplay()
    expect(replayProgress.value).toBeNull()
  })
})
