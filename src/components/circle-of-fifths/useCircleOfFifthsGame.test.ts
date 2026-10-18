import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import type { NoteInfo } from '@/utils/noteUtils'
import { midiToFrequency, midiToNoteLabel } from '@/utils/noteUtils'
import { CLEAN_CENTS } from '@/utils/pitchColors'
import type {
  CircleOfFifthsGameOptions,
  PitchDetectionProvider,
} from './useCircleOfFifthsGame'
import {
  GRACE_PERIOD_MS,
  HOLD_DURATION_OPTIONS,
  SHOULD_PLAY_CLOSING_CHORD,
  useCircleOfFifthsGame,
} from './useCircleOfFifthsGame'
import { createMockToneEngine } from '@/composables/toneEngine.mock'

/* Long enough to outlast any reference tone's deaf window plus one hold */
const HOLD_STEP_MS = 4000

/* useMachine starts its actor in onMounted, so the composable runs inside a
 * mounted component (same setup as useDoReMiGame.test.ts). */
const wrappers: { unmount: () => void }[] = []

function mountGame(options: CircleOfFifthsGameOptions) {
  let api!: ReturnType<typeof useCircleOfFifthsGame>
  const wrapper = mount({
    setup() {
      api = useCircleOfFifthsGame(options)
      return () => h('div')
    },
  })
  wrappers.push(wrapper)
  return api
}

function createMockPitchDetection({ canListen = true } = {}) {
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
      isListening.value = canListen
    }),
    stop: vi.fn(() => {
      isListening.value = false
    }),
  }

  function singMidi(midi: number, centsOffset = 0) {
    /* 1200 cents per octave */
    const hz = midiToFrequency(midi) * Math.pow(2, centsOffset / 1200)
    const { note, octave } = midiToNoteLabel(midi)
    frequency.value = hz
    noteInfo.value = {
      note: note as NoteInfo['note'],
      octave,
      cents: centsOffset,
      midiNote: midi,
      frequency: hz,
    }
    isClean.value = true
  }

  function silence() {
    frequency.value = null
    noteInfo.value = null
    isClean.value = false
  }

  return { provider, singMidi, silence }
}

function setup(options: Partial<CircleOfFifthsGameOptions> = {}) {
  const mock = createMockPitchDetection()
  const toneEngine = createMockToneEngine()
  const game = mountGame({
    pitchDetection: mock.provider,
    toneEngine,
    ...options,
  })

  async function holdCurrentTarget() {
    const target = game.currentTarget.value
    if (!target) throw new Error('No current target')

    mock.singMidi(target.midi)
    await vi.advanceTimersByTimeAsync(HOLD_STEP_MS)
  }

  return { game, mock, toneEngine, holdCurrentTarget }
}

describe('useCircleOfFifthsGame - walk', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    while (wrappers.length) wrappers.pop()!.unmount()
    vi.useRealTimers()
  })

  test('should start idle with nothing lit', () => {
    const { game } = setup()

    expect(game.phase.value).toBe('idle')
    expect(game.litKeyIndices.value).toEqual([])
    expect(game.currentTarget.value).toBeNull()
  })

  test('should stay idle when the mic is denied', async () => {
    const mock = createMockPitchDetection({ canListen: false })
    const game = mountGame({
      pitchDetection: mock.provider,
      toneEngine: createMockToneEngine(),
    })

    await game.startWalk()

    expect(game.phase.value).toBe('idle')
  })

  test('should start on DO of C and play it as a reference', async () => {
    const { game, toneEngine } = setup()

    await game.startWalk()

    expect(game.phase.value).toBe('walking')
    expect(game.targets.value).toHaveLength(13)
    expect(game.currentTarget.value).toEqual({
      midi: 60,
      solfege: 'DO',
      keyIndex: 0,
    })
    expect(game.walkStartMidi.value).toBe(60)
    expect(toneEngine.playToneAt).toHaveBeenCalledWith(
      midiToFrequency(60),
      expect.any(Number),
      expect.any(Number),
    )
  })

  test('should ignore the right note while the reference tone rings', async () => {
    const { game, mock } = setup()

    await game.startWalk()
    mock.singMidi(60)
    await vi.advanceTimersByTimeAsync(300)

    expect(game.isDeaf.value).toBe(true)
    expect(game.isSingingCorrectNote.value).toBe(false)
    expect(game.holdTimeMs.value).toBe(0)
  })

  test('should not report a sung note while idle', () => {
    const { game, mock } = setup()

    mock.singMidi(60)

    expect(game.sungMidi.value).toBeNull()
  })

  test('should hide the sung note while the reference tone rings', async () => {
    const { game, mock } = setup()

    await game.startWalk()
    mock.singMidi(55)
    await vi.advanceTimersByTimeAsync(300)

    expect(game.sungMidi.value).toBeNull()
  })

  test('should report the sung note once the reference has faded', async () => {
    const { game, mock } = setup()

    await game.startWalk()
    await vi.advanceTimersByTimeAsync(HOLD_STEP_MS)
    mock.singMidi(55)
    await vi.advanceTimersByTimeAsync(100)

    expect(game.sungMidi.value).toBe(55)
    expect(game.isSingingCorrectNote.value).toBe(false)

    mock.singMidi(60)
    await vi.advanceTimersByTimeAsync(100)

    expect(game.sungMidi.value).toBe(60)
    expect(game.isSingingCorrectNote.value).toBe(true)
  })

  test('should keep the sung note while the pitch hovers between two semitones', async () => {
    const { game, mock } = setup()

    await game.startWalk()
    await vi.advanceTimersByTimeAsync(HOLD_STEP_MS)
    mock.singMidi(66, 45)
    await vi.advanceTimersByTimeAsync(100)

    expect(game.sungMidi.value).toBe(66)

    /* Just past the midpoint, still inside the dead band */
    mock.singMidi(67, -45)
    await vi.advanceTimersByTimeAsync(100)

    expect(game.sungMidi.value).toBe(66)

    /* Clear of the dead band */
    mock.singMidi(67, -25)
    await vi.advanceTimersByTimeAsync(100)

    expect(game.sungMidi.value).toBe(67)
  })

  test('should name the target while a pass sits inside the dead band', async () => {
    const { game, mock } = setup()

    await game.startWalk()
    await vi.advanceTimersByTimeAsync(HOLD_STEP_MS)
    mock.singMidi(59, 45)
    await vi.advanceTimersByTimeAsync(100)

    expect(game.sungMidi.value).toBe(59)

    /* 45 cents flat of DO passes on easy */
    mock.singMidi(60, -45)
    await vi.advanceTimersByTimeAsync(100)

    expect(game.isSingingCorrectNote.value).toBe(true)
    expect(game.sungMidi.value).toBe(60)
  })

  test('should round afresh after silence', async () => {
    const { game, mock } = setup()

    await game.startWalk()
    await vi.advanceTimersByTimeAsync(HOLD_STEP_MS)
    mock.singMidi(66, 45)
    await vi.advanceTimersByTimeAsync(100)
    mock.silence()
    await vi.advanceTimersByTimeAsync(100)

    expect(game.sungMidi.value).toBeNull()

    mock.singMidi(67, -45)
    await vi.advanceTimersByTimeAsync(100)

    expect(game.sungMidi.value).toBe(67)
  })

  test('should light C and move on to SO after holding DO', async () => {
    const { game, holdCurrentTarget } = setup()

    await game.startWalk()
    await holdCurrentTarget()

    expect(game.litKeyIndices.value).toEqual([0])
    expect(game.currentTarget.value).toEqual({
      midi: 55,
      solfege: 'SO',
      keyIndex: 0,
    })
    expect(game.nextKeyIndex.value).toBe(1)
  })

  test.each([
    { holdDurationMs: 300, expected: 'SO' },
    { holdDurationMs: 750, expected: 'DO' },
  ])(
    'should be on $expected after 400ms of DO with a ${holdDurationMs}ms hold',
    async ({ holdDurationMs, expected }) => {
      const { game, mock } = setup()

      game.setHoldDuration(holdDurationMs)
      await game.startWalk()
      await vi.advanceTimersByTimeAsync(HOLD_STEP_MS)
      mock.singMidi(60)
      await vi.advanceTimersByTimeAsync(400)

      expect(game.currentTarget.value?.solfege).toBe(expected)
    },
  )

  test('should keep hold progress when the hold duration changes mid-note', async () => {
    const { game, mock } = setup()

    await game.startWalk()
    await vi.advanceTimersByTimeAsync(HOLD_STEP_MS)
    mock.singMidi(60)
    await vi.advanceTimersByTimeAsync(400)

    expect(game.currentTarget.value?.solfege).toBe('DO')

    game.setHoldDuration(500)
    await vi.advanceTimersByTimeAsync(150)

    expect(game.currentTarget.value?.solfege).toBe('SO')
  })

  test('should offer only holds longer than the grace period', () => {
    for (const sec of HOLD_DURATION_OPTIONS) {
      expect(sec * 1000).toBeGreaterThan(GRACE_PERIOD_MS)
    }
  })

  test('should ring no chord while the first reference note plays', async () => {
    const { game } = setup()

    await game.startWalk()

    expect(game.isChordRinging.value).toBe(false)
  })

  test('should ring the C chord after DO and let it fade', async () => {
    const { game, mock } = setup()

    await game.startWalk()
    await vi.advanceTimersByTimeAsync(HOLD_STEP_MS)
    mock.singMidi(60)
    await vi.waitFor(() => expect(game.isChordRinging.value).toBe(true))

    expect(game.chordMidis.value).toEqual([60, 64, 67])
    await vi.advanceTimersByTimeAsync(HOLD_STEP_MS)
    expect(game.isChordRinging.value).toBe(false)
    expect(game.chordMidis.value).toEqual([60, 64, 67])
  })

  test('should have no hop direction on the first note', async () => {
    const { game } = setup()

    await game.startWalk()

    expect(game.hopDirection.value).toBeNull()
  })

  test('should point down when the walk hops down a fourth', async () => {
    const { game, holdCurrentTarget } = setup()

    await game.startWalk()
    await holdCurrentTarget()

    /* C4 → G3: down a fourth stays in G3–G4, a fifth up to G4 wouldn't fit the window */
    expect(game.currentTarget.value?.midi).toBe(55)
    expect(game.hopDirection.value).toBe('down')
    await holdCurrentTarget()
    expect(game.hopDirection.value).toBe('up')
  })

  test('should hop up a fourth (FA) when walking counter-clockwise', async () => {
    const { game, holdCurrentTarget } = setup()
    game.setDirection('counterClockwise')

    await game.startWalk()
    await holdCurrentTarget()

    expect(game.currentTarget.value?.solfege).toBe('FA')
    expect(game.currentTarget.value?.midi).toBe(65)
    expect(game.nextKeyIndex.value).toBe(11)
    expect(game.hopDirection.value).toBe('up')
  })

  test('should light all 12 keys and finish back on C', async () => {
    const { game, mock, holdCurrentTarget } = setup()

    await game.startWalk()
    for (let hold = 0; hold < 13; hold++) await holdCurrentTarget()

    expect(game.phase.value).toBe('walkComplete')
    expect([...game.litKeyIndices.value].sort((a, b) => a - b)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
    ])
    expect(mock.provider.stop).toHaveBeenCalled()
  })

  test.runIf(!SHOULD_PLAY_CLOSING_CHORD)(
    'should finish silently and release the mic at once',
    async () => {
      const { game, mock, toneEngine, holdCurrentTarget } = setup()

      await game.startWalk()
      for (let hold = 0; hold < 12; hold++) await holdCurrentTarget()
      vi.mocked(toneEngine.playToneAt).mockClear()
      mock.singMidi(game.currentTarget.value!.midi)
      await vi.waitFor(() => expect(game.phase.value).toBe('walkComplete'))

      expect(mock.provider.stop).toHaveBeenCalledTimes(1)
      await vi.advanceTimersByTimeAsync(HOLD_STEP_MS)
      expect(toneEngine.playToneAt).not.toHaveBeenCalled()
    },
  )

  test.runIf(SHOULD_PLAY_CLOSING_CHORD)(
    'should keep the mic open until the closing chord has rung out',
    async () => {
      const { game, mock, holdCurrentTarget } = setup()

      await game.startWalk()
      for (let hold = 0; hold < 12; hold++) await holdCurrentTarget()
      mock.singMidi(game.currentTarget.value!.midi)
      await vi.waitFor(() => expect(game.phase.value).toBe('walkComplete'))

      expect(mock.provider.stop).not.toHaveBeenCalled()
      await vi.advanceTimersByTimeAsync(HOLD_STEP_MS)
      expect(mock.provider.stop).toHaveBeenCalledTimes(1)
    },
  )

  test.runIf(SHOULD_PLAY_CLOSING_CHORD)(
    'should not close the mic on a replay started while the chord rings',
    async () => {
      const { game, mock, holdCurrentTarget } = setup()

      await game.startWalk()
      for (let hold = 0; hold < 12; hold++) await holdCurrentTarget()
      mock.singMidi(game.currentTarget.value!.midi)
      await vi.waitFor(() => expect(game.phase.value).toBe('walkComplete'))
      await game.startWalk()
      await vi.advanceTimersByTimeAsync(HOLD_STEP_MS)

      expect(game.phase.value).toBe('walking')
      expect(mock.provider.stop).not.toHaveBeenCalled()
    },
  )

  test('should reject a note just outside CLEAN_CENTS on hard', async () => {
    const { game, mock } = setup({ difficulty: 'hard' })

    await game.startWalk()
    await vi.advanceTimersByTimeAsync(HOLD_STEP_MS)
    mock.singMidi(60, CLEAN_CENTS + 5)
    await vi.advanceTimersByTimeAsync(HOLD_STEP_MS)

    expect(game.isSingingCorrectNote.value).toBe(false)
    expect(game.litKeyIndices.value).toEqual([])
  })

  test('should stop the walk when the direction changes', async () => {
    const { game } = setup()

    await game.startWalk()
    game.setDirection('counterClockwise')

    expect(game.phase.value).toBe('idle')
    expect(game.targets.value).toEqual([])
  })
})

describe('useCircleOfFifthsGame - explore', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    while (wrappers.length) wrappers.pop()!.unmount()
    vi.useRealTimers()
  })

  test('should play a key without opening the mic', () => {
    const { game, mock, toneEngine } = setup()

    game.selectKey(1)

    expect(game.selectedKeyIndex.value).toBe(1)
    expect(mock.provider.start).not.toHaveBeenCalled()
    return vi.waitFor(() =>
      expect(toneEngine.playToneAt).toHaveBeenCalledTimes(3),
    )
  })

  test('should play the DO of a key in the walk octave without selecting it', () => {
    const { game, mock, toneEngine } = setup()

    game.playKeyTone(1)

    expect(game.selectedKeyIndex.value).toBeNull()
    expect(mock.provider.start).not.toHaveBeenCalled()
    /* G in the G3–G4 walk window is G3 (MIDI 55), the walk's own G */
    return vi.waitFor(() => {
      expect(toneEngine.playToneAt).toHaveBeenCalledTimes(1)
      expect(toneEngine.playToneAt).toHaveBeenCalledWith(
        midiToFrequency(55),
        expect.any(Number),
        expect.any(Number),
      )
    })
  })

  test('should not play a key tone during a round', async () => {
    const { game, toneEngine } = setup()

    await game.startWalk()
    vi.mocked(toneEngine.playToneAt).mockClear()
    game.playKeyTone(1)
    await vi.advanceTimersByTimeAsync(50)

    expect(toneEngine.playToneAt).not.toHaveBeenCalled()
  })

  test('should mark a key explored after DO MI SO MI DO', async () => {
    const { game, holdCurrentTarget } = setup()

    await game.startPattern(1, 'doMiSo')
    expect(game.targets.value.map((target) => target.solfege)).toEqual([
      'DO',
      'MI',
      'SO',
      'MI',
      'DO',
    ])
    for (let hold = 0; hold < 5; hold++) await holdCurrentTarget()

    expect(game.phase.value).toBe('idle')
    expect(game.exploredKeyIndices.value).toEqual([1])
    expect(game.exploredMinorKeyIndices.value).toEqual([])
  })

  test('should light the relative minor after DO LA', async () => {
    const { game, holdCurrentTarget } = setup()

    await game.startPattern(0, 'doLa')
    const [doTarget, laTarget] = game.targets.value
    expect(laTarget.midi - doTarget.midi).toBe(-3)
    await holdCurrentTarget()
    await holdCurrentTarget()

    expect(game.exploredMinorKeyIndices.value).toEqual([0])
  })
})
