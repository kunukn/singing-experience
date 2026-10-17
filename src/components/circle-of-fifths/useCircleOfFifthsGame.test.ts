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
import { useCircleOfFifthsGame } from './useCircleOfFifthsGame'
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

  return { provider, singMidi }
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

  test('should hop up a fourth (FA) when walking counter-clockwise', async () => {
    const { game, holdCurrentTarget } = setup()
    game.setDirection('counterClockwise')

    await game.startWalk()
    await holdCurrentTarget()

    expect(game.currentTarget.value?.solfege).toBe('FA')
    expect(game.currentTarget.value?.midi).toBe(65)
    expect(game.nextKeyIndex.value).toBe(11)
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
