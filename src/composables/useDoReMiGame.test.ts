import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'
import type { NoteInfo } from '@/utils/noteUtils'
import { buildMajorScale, C3_MIDI, noteToFrequency } from '@/utils/noteUtils'
import type { PitchDetectionProvider } from './useDoReMiGame'
import {
  useDoReMiGame,
  GRACE_PERIOD_MS,
  MAX_CENTS_DEVIATION,
  DEFAULT_STARTING_SEMITONE_OFFSET,
} from './useDoReMiGame'

function createMockPitchDetection() {
  const frequency = ref<number | null>(null)
  const noteInfo = ref<NoteInfo | null>(null)
  const isListening = ref(false)
  const isClean = ref(false)
  const error = ref<string | null>(null)

  const provider: PitchDetectionProvider = {
    frequency: readonly(frequency),
    noteInfo: readonly(noteInfo),
    isListening: readonly(isListening),
    isClean: readonly(isClean),
    error: readonly(error),
    start: vi.fn(() => {
      isListening.value = true
    }),
    stop: vi.fn(() => {
      isListening.value = false
    }),
  }

  return {
    provider,
    setFrequency: (hz: number | null) => {
      frequency.value = hz
    },
    setNoteInfo: (info: NoteInfo | null) => {
      noteInfo.value = info
    },
    setIsClean: (clean: boolean) => {
      isClean.value = clean
    },
    setIsListening: (listening: boolean) => {
      isListening.value = listening
    },
    setError: (err: string | null) => {
      error.value = err
    },
  }
}

function simulateSingingNote(
  mock: ReturnType<typeof createMockPitchDetection>,
  note: string,
  octave: number,
  centsOffset = 0,
) {
  const baseFreq = noteToFrequency(note as never, octave)
  const freq = baseFreq * Math.pow(2, centsOffset / 1200)
  const midiNote = Math.round(12 * Math.log2(baseFreq / 440) + 69)

  mock.setFrequency(freq)
  mock.setNoteInfo({
    note: note as never,
    octave,
    cents: centsOffset,
    midiNote,
    frequency: freq,
  })
  mock.setIsClean(true)
}

function advanceRAF(ms: number) {
  vi.advanceTimersByTime(ms)
}

describe('useDoReMiGame', () => {
  const scaleSteps = buildMajorScale(C3_MIDI + DEFAULT_STARTING_SEMITONE_OFFSET)

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('should have correct initial state', () => {
    const mock = createMockPitchDetection()
    const game = useDoReMiGame({ pitchDetection: mock.provider })

    expect(game.isStarted.value).toBe(false)
    expect(game.isComplete.value).toBe(false)
    expect(game.currentStepIndex.value).toBe(0)
    expect(game.holdProgress.value).toBe(0)
    expect(game.isSingingCorrectNote.value).toBe(false)
  })

  test('should start detection and timer on start()', async () => {
    const mock = createMockPitchDetection()
    const game = useDoReMiGame({ pitchDetection: mock.provider })

    await game.start()

    expect(game.isStarted.value).toBe(true)
    expect(mock.provider.start).toHaveBeenCalled()
    expect(game.isListening.value).toBe(true)
  })

  test('should detect correct note when singing the target', async () => {
    const mock = createMockPitchDetection()
    const game = useDoReMiGame({ pitchDetection: mock.provider })

    await game.start()

    const target = scaleSteps[0]
    simulateSingingNote(mock, target.note, target.octave)
    await nextTick()

    expect(game.isSingingCorrectNote.value).toBe(true)
  })

  test('should reject note when not clean', async () => {
    const mock = createMockPitchDetection()
    const game = useDoReMiGame({ pitchDetection: mock.provider })

    await game.start()

    const target = scaleSteps[0]
    simulateSingingNote(mock, target.note, target.octave)
    mock.setIsClean(false)
    await nextTick()

    expect(game.isSingingCorrectNote.value).toBe(false)
  })

  test('should reject note when cents deviation exceeds threshold', async () => {
    const mock = createMockPitchDetection()
    const game = useDoReMiGame({ pitchDetection: mock.provider })

    await game.start()

    const target = scaleSteps[0]
    simulateSingingNote(
      mock,
      target.note,
      target.octave,
      MAX_CENTS_DEVIATION + 10,
    )
    await nextTick()

    expect(game.isSingingCorrectNote.value).toBe(false)
  })

  test('should compute centsFromTarget correctly', async () => {
    const mock = createMockPitchDetection()
    const game = useDoReMiGame({ pitchDetection: mock.provider })

    await game.start()

    const target = scaleSteps[0]
    simulateSingingNote(mock, target.note, target.octave, 20)
    await nextTick()

    expect(game.centsFromTarget.value).toBeCloseTo(20, 0)
  })

  test('should accumulate hold time when singing correctly', async () => {
    const mock = createMockPitchDetection()
    const game = useDoReMiGame({ pitchDetection: mock.provider })

    await game.start()

    const target = scaleSteps[0]
    simulateSingingNote(mock, target.note, target.octave)
    await nextTick()

    advanceRAF(500)

    expect(game.holdTimeMs.value).toBeGreaterThan(0)
    expect(game.holdProgress.value).toBeGreaterThan(0)
    expect(game.holdProgress.value).toBeLessThan(1)
  })

  test('should reset hold after grace period when note is wrong', async () => {
    const mock = createMockPitchDetection()
    const game = useDoReMiGame({ pitchDetection: mock.provider })

    await game.start()

    const target = scaleSteps[0]
    simulateSingingNote(mock, target.note, target.octave)
    await nextTick()

    advanceRAF(500)
    expect(game.holdTimeMs.value).toBeGreaterThan(0)

    mock.setIsClean(false)
    await nextTick()

    advanceRAF(GRACE_PERIOD_MS + 50)

    expect(game.holdTimeMs.value).toBe(0)
  })

  test('should advance step after holding correct note for holdDurationMs', async () => {
    const holdDurationMs = 200
    const mock = createMockPitchDetection()
    const game = useDoReMiGame({
      pitchDetection: mock.provider,
      holdDurationMs,
    })

    await game.start()

    const target = scaleSteps[0]
    simulateSingingNote(mock, target.note, target.octave)
    await nextTick()

    advanceRAF(holdDurationMs + 50)

    expect(game.currentStepIndex.value).toBe(1)
  })

  test('should complete game after all steps are passed', async () => {
    const holdDurationMs = 100
    const mock = createMockPitchDetection()
    const game = useDoReMiGame({
      pitchDetection: mock.provider,
      holdDurationMs,
    })

    await game.start()

    for (let i = 0; i < scaleSteps.length; i++) {
      const step = scaleSteps[i]
      simulateSingingNote(mock, step.note, step.octave)
      await nextTick()

      advanceRAF(holdDurationMs + 50)
    }

    expect(game.isComplete.value).toBe(true)
  })

  test('should reset all state on stop()', async () => {
    const holdDurationMs = 200
    const mock = createMockPitchDetection()
    const game = useDoReMiGame({
      pitchDetection: mock.provider,
      holdDurationMs,
    })

    await game.start()

    const target = scaleSteps[0]
    simulateSingingNote(mock, target.note, target.octave)
    await nextTick()
    advanceRAF(holdDurationMs + 50)

    expect(game.currentStepIndex.value).toBe(1)

    game.stop()

    expect(game.isStarted.value).toBe(false)
    expect(game.currentStepIndex.value).toBe(0)
    expect(game.holdTimeMs.value).toBe(0)
    expect(game.isComplete.value).toBe(false)
    expect(mock.provider.stop).toHaveBeenCalled()
  })

  test('should change scale and stop game on setStartingSemitoneOffset()', async () => {
    const mock = createMockPitchDetection()
    const game = useDoReMiGame({ pitchDetection: mock.provider })

    await game.start()

    game.setStartingSemitoneOffset(2)

    expect(game.isStarted.value).toBe(false)

    const newScale = buildMajorScale(C3_MIDI + 2)
    expect(game.scaleSteps.value[0].note).toBe(newScale[0].note)
  })
})
