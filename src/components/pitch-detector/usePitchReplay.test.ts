import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { usePitchReplay } from './usePitchReplay'
import type { PitchSample } from './pitchLaneRecorder'

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

    replayPitchHistory({ low: samples })

    expect(isReplaying.value).toBe(true)
    expect(mockOscillator.start).toHaveBeenCalledTimes(1)
    expect(mockOscillator.stop).toHaveBeenCalledTimes(1)
  })

  test('should schedule frequency ramps for each clean sample', () => {
    const { mockFrequencyParam } = mockAudioContextGlobal()

    const { replayPitchHistory } = usePitchReplay()
    const samples = createMockSamples(5)

    replayPitchHistory({ low: samples })

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

    replayPitchHistory({ low: samples })

    /* All samples are unclean — nothing should play */
    expect(isReplaying.value).toBe(false)
    expect(mockFrequencyParam.linearRampToValueAtTime).not.toHaveBeenCalled()
  })

  test('should stop replaying and disconnect nodes', () => {
    const { mockOscillator, mockGainNode } = mockAudioContextGlobal()

    const { isReplaying, replayPitchHistory, stopReplay } = usePitchReplay()
    const samples = createMockSamples(10)

    replayPitchHistory({ low: samples })
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

    replayPitchHistory({ low: samples })
    expect(isReplaying.value).toBe(true)

    /* Total duration: (4 * 50ms) samples + 100ms buffer = 300ms */
    vi.advanceTimersByTime(500)

    expect(isReplaying.value).toBe(false)
  })

  test('should handle empty samples array without error', () => {
    const { isReplaying, replayPitchHistory } = usePitchReplay()

    replayPitchHistory({})

    expect(isReplaying.value).toBe(false)
  })

  test('should give each duet lane its own voice', () => {
    const { mockCtx, mockOscillator } = mockAudioContextGlobal()

    const { replayPitchHistory } = usePitchReplay()

    replayPitchHistory({
      low: createMockSamples(5, 48),
      high: createMockSamples(5, 72),
    })

    expect(mockCtx.createOscillator).toHaveBeenCalledTimes(2)
    expect(mockCtx.createGain).toHaveBeenCalledTimes(2)
    expect(mockOscillator.start).toHaveBeenCalledTimes(2)
  })

  test('should schedule both duet lanes against one shared time origin', () => {
    const { mockFrequencyParam } = mockAudioContextGlobal()

    const { replayPitchHistory } = usePitchReplay()

    /* The low voice opens at t=1000; the high one comes in 200 ms later. That
     * 200 ms gap has to survive playback, or the lanes collapse onto the same
     * downbeat. */
    replayPitchHistory({
      low: [
        { midiNote: 48, timestamp: 1000, isClean: true, cents: 0 },
        { midiNote: 48, timestamp: 1400, isClean: true, cents: 0 },
      ],
      high: [
        { midiNote: 72, timestamp: 1200, isClean: true, cents: 0 },
        { midiNote: 72, timestamp: 1400, isClean: true, cents: 0 },
      ],
    })

    const rampTimes = mockFrequencyParam.linearRampToValueAtTime.mock.calls.map(
      (call) => call[1],
    )

    /* ctx.currentTime is 0 in the mock, so offsets are the absolute times. */
    expect(rampTimes).toContain(0) // low lane's first sample, at the origin
    expect(rampTimes).toContain(0.2) // high lane's entry, 200 ms in
    expect(rampTimes).toContain(0.4) // both lanes' last sample
  })

  test('should ignore a lane that recorded nothing', () => {
    const { mockCtx } = mockAudioContextGlobal()

    const { isReplaying, replayPitchHistory } = usePitchReplay()

    replayPitchHistory({ low: createMockSamples(5), high: [] })

    expect(isReplaying.value).toBe(true)
    expect(mockCtx.createOscillator).toHaveBeenCalledTimes(1)
  })

  test('should tear down every duet voice on stopReplay', () => {
    const { mockOscillator, mockGainNode } = mockAudioContextGlobal()

    const { replayPitchHistory, stopReplay } = usePitchReplay()

    replayPitchHistory({
      low: createMockSamples(5, 48),
      high: createMockSamples(5, 72),
    })
    mockOscillator.disconnect.mockClear()
    mockGainNode.disconnect.mockClear()

    stopReplay()

    expect(mockOscillator.disconnect).toHaveBeenCalledTimes(2)
    expect(mockGainNode.disconnect).toHaveBeenCalledTimes(2)
  })

  test('should stop previous replay when starting a new one', () => {
    const { mockOscillator } = mockAudioContextGlobal()

    const { replayPitchHistory } = usePitchReplay()
    const samples = createMockSamples(5)

    replayPitchHistory({ low: samples })

    /* Reset to track the second call's oscillator */
    const firstStop = mockOscillator.stop.mock.calls.length

    replayPitchHistory({ low: samples })

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

    replayPitchHistory({ low: samples })

    expect(replayProgress.value).toBe(0)
  })

  test('should finish in half the time when speed is 2', () => {
    mockAudioContextGlobal()

    const { isReplaying, replayPitchHistory } = usePitchReplay()
    /* 10 samples × 50ms = 450ms span; at 2× scaled to 225ms + 100ms buffer = 325ms total */
    const samples = createMockSamples(10)

    replayPitchHistory({ low: samples }, { speed: 2 })
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

    replayPitchHistory({ low: samples })
    expect(replayProgress.value).toBe(0)

    stopReplay()
    expect(replayProgress.value).toBeNull()
  })
})
