import { mount } from '@vue/test-utils'
import type { NoteInfo } from '@/utils/noteUtils'
import { frequencyToNote, midiToFrequency } from '@/utils/noteUtils'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { h } from 'vue'
import type { PitchDetectionProvider, singToneOptions } from './useSingTone'
import {
  DEAF_PERIOD_MS,
  GRACE_PERIOD_MS,
  MAX_CENTS_DEVIATION,
  SKIP_UNLOCK_MS,
  DEFAULT_TOTAL_ROUNDS,
  DEFAULT_HOLD_DURATION_MS,
  HOLD_DURATION_OPTIONS,
  useSingTone,
} from './useSingTone'

test('HOLD_DURATION_OPTIONS includes the default hold duration', () => {
  expect(HOLD_DURATION_OPTIONS).toContain(DEFAULT_HOLD_DURATION_MS / 1000)
})

/* useSingTone owns an XState actor via @xstate/vue's useMachine, which starts
 * the actor in onMounted — so the composable must run inside a mounted
 * component. mountGame mirrors useDoReMiGame.test.ts's helper. The pure FSM
 * graph is covered by singToneMachine.test.ts; here we assert the
 * useSingTone ↔ machine contract and the existing timing/scoring behavior. */
const wrappers: { unmount: () => void }[] = []

function mountGame(options: singToneOptions) {
  let api!: ReturnType<typeof useSingTone>
  const wrapper = mount({
    setup() {
      api = useSingTone(options)
      return () => h('div')
    },
  })
  wrappers.push(wrapper)
  return api
}

vi.mock('@/composables/useTonePlayer', () => ({
  useTonePlayer: () => ({
    playTone: vi.fn().mockResolvedValue(undefined),
    setToneMode: vi.fn(),
    toneMode: ref('keyboard'),
    isPlaying: ref(false),
  }),
}))

function createMockPitchDetection() {
  const frequency = ref<number | null>(null)
  const noteInfo = ref<NoteInfo | null>(null)
  const clarity = ref(0)
  const isListening = ref(false)
  const isClean = ref(false)
  const error = ref<string | null>(null)

  const provider: PitchDetectionProvider = {
    frequency: readonly(frequency),
    noteInfo: readonly(noteInfo),
    clarity: readonly(clarity),
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
    setClarity: (value: number) => {
      clarity.value = value
    },
    setIsClean: (clean: boolean) => {
      isClean.value = clean
    },
    setIsListening: (listening: boolean) => {
      isListening.value = listening
    },
  }
}

/* Detector confidence, 0–1: a clear sung tone sits above the 0.9 default gate
 * and breath or room tone well below it. */
const SUNG_CLARITY = 0.95
const SILENCE_CLARITY = 0.3

/* One clean frame as usePitchDetection reports it: the note is whichever one
 * the frequency belongs to, so far enough off `midi` it is a neighbour. */
function simulateSingingMidi(
  mock: ReturnType<typeof createMockPitchDetection>,
  midi: number,
  centsOffset = 0,
) {
  /* 1200 cents per octave */
  const sungFrequency = midiToFrequency(midi) * 2 ** (centsOffset / 1200)

  mock.setClarity(SUNG_CLARITY)
  /* The detector reports the frequency to 0.1 Hz. */
  mock.setFrequency(Math.round(sungFrequency * 10) / 10)
  mock.setNoteInfo(frequencyToNote(sungFrequency))
  mock.setIsClean(true)
}

/* A frame under the clarity gate: the detector reports no pitch at all. */
function simulateSilence(mock: ReturnType<typeof createMockPitchDetection>) {
  mock.setClarity(SILENCE_CLARITY)
  mock.setFrequency(null)
  mock.setNoteInfo(null)
  mock.setIsClean(false)
}

function advanceRAF(ms: number) {
  vi.advanceTimersByTime(ms)
}

describe('useSingTone', () => {
  /* Tenor range: C3 (48) – C5 (72) */
  const MIDI_MIN = 48
  const MIDI_MAX = 72

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    while (wrappers.length) wrappers.pop()!.unmount()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  test('should have correct initial state', () => {
    const mock = createMockPitchDetection()
    const game = mountGame({
      pitchDetection: mock.provider,
      midiMin: MIDI_MIN,
      midiMax: MIDI_MAX,
    })

    expect(game.isStarted.value).toBe(false)
    expect(game.isComplete.value).toBe(false)
    expect(game.completedCount.value).toBe(0)
    expect(game.targetMidi.value).toBe(null)
    expect(game.holdProgress.value).toBe(0)
    expect(game.isSingingCorrectNote.value).toBe(false)
    expect(game.totalRounds.value).toBe(DEFAULT_TOTAL_ROUNDS)
  })

  test('should start detection and generate target on start()', async () => {
    const mock = createMockPitchDetection()
    const game = mountGame({
      pitchDetection: mock.provider,
      midiMin: MIDI_MIN,
      midiMax: MIDI_MAX,
    })

    await game.start()

    expect(game.isStarted.value).toBe(true)
    expect(mock.provider.start).toHaveBeenCalled()
    expect(game.isListening.value).toBe(true)
    expect(game.targetMidi.value).not.toBe(null)
  })

  /* C4–D4, away from the composable's own default range, so ignoring the
   * options would show. Math.random() returns 0 up to, but never, 1. */
  test.each([
    { name: 'lowest', random: 0, expected: 60 },
    { name: 'highest', random: 0.999, expected: 62 },
  ])(
    'should pick the $name note of the midi range on the $name random draw',
    async ({ random, expected }) => {
      vi.spyOn(Math, 'random').mockReturnValue(random)
      const mock = createMockPitchDetection()
      const game = mountGame({
        pitchDetection: mock.provider,
        midiMin: 60,
        midiMax: 62,
      })

      await game.start()

      expect(game.targetMidi.value).toBe(expected)
    },
  )

  test('should detect correct note when singing the target', async () => {
    const mock = createMockPitchDetection()
    const game = mountGame({
      pitchDetection: mock.provider,
      midiMin: MIDI_MIN,
      midiMax: MIDI_MAX,
    })

    await game.start()
    advanceRAF(DEAF_PERIOD_MS + 50)

    const target = game.targetMidi.value!
    simulateSingingMidi(mock, target)
    await nextTick()

    expect(game.isSingingCorrectNote.value).toBe(true)
  })

  test('should stop matching when the pitch is lost', async () => {
    const mock = createMockPitchDetection()
    const game = mountGame({
      pitchDetection: mock.provider,
      midiMin: MIDI_MIN,
      midiMax: MIDI_MAX,
    })

    await game.start()
    advanceRAF(DEAF_PERIOD_MS + 50)

    const target = game.targetMidi.value!
    simulateSingingMidi(mock, target)
    await nextTick()
    expect(game.isSingingCorrectNote.value).toBe(true)

    simulateSilence(mock)
    await nextTick()

    expect(game.isSingingCorrectNote.value).toBe(false)
  })

  /* The tolerance is half a semitone, so a pitch outside it is one the
   * detector already names as the neighbouring note. */
  test.each([
    {
      name: 'accept a pitch inside',
      centsOffset: MAX_CENTS_DEVIATION - 10,
      expected: true,
    },
    {
      name: 'reject a pitch outside',
      centsOffset: MAX_CENTS_DEVIATION + 10,
      expected: false,
    },
  ])('should $name the cents tolerance', async ({ centsOffset, expected }) => {
    const mock = createMockPitchDetection()
    const game = mountGame({
      pitchDetection: mock.provider,
      midiMin: MIDI_MIN,
      midiMax: MIDI_MAX,
    })

    await game.start()
    advanceRAF(DEAF_PERIOD_MS + 50)

    const target = game.targetMidi.value!
    simulateSingingMidi(mock, target, centsOffset)
    await nextTick()

    expect(game.isSingingCorrectNote.value).toBe(expected)
  })

  test('should accumulate hold time when singing correctly', async () => {
    const mock = createMockPitchDetection()
    const game = mountGame({
      pitchDetection: mock.provider,
      midiMin: MIDI_MIN,
      midiMax: MIDI_MAX,
    })

    await game.start()
    advanceRAF(DEAF_PERIOD_MS + 50)

    const target = game.targetMidi.value!
    simulateSingingMidi(mock, target)
    await nextTick()

    advanceRAF(500)

    expect(game.holdTimeMs.value).toBeGreaterThan(0)
    expect(game.holdProgress.value).toBeGreaterThan(0)
    expect(game.holdProgress.value).toBeLessThan(1)
  })

  test('should reset hold after grace period when note is wrong', async () => {
    const mock = createMockPitchDetection()
    const game = mountGame({
      pitchDetection: mock.provider,
      midiMin: MIDI_MIN,
      midiMax: MIDI_MAX,
    })

    await game.start()
    advanceRAF(DEAF_PERIOD_MS + 50)

    const target = game.targetMidi.value!
    simulateSingingMidi(mock, target)
    await nextTick()

    advanceRAF(500)
    expect(game.holdTimeMs.value).toBeGreaterThan(0)

    /* A whole tone above the target */
    simulateSingingMidi(mock, target + 2)
    await nextTick()

    advanceRAF(GRACE_PERIOD_MS + 50)

    expect(game.holdTimeMs.value).toBe(0)
  })

  test('should advance after holding correct note for full duration', async () => {
    const mock = createMockPitchDetection()
    const holdMs = 500
    const game = mountGame({
      pitchDetection: mock.provider,
      midiMin: MIDI_MIN,
      midiMax: MIDI_MAX,
      holdDurationMs: holdMs,
    })

    await game.start()
    advanceRAF(DEAF_PERIOD_MS + 50)

    const firstTarget = game.targetMidi.value!
    simulateSingingMidi(mock, firstTarget)
    await nextTick()

    advanceRAF(holdMs + 50)

    expect(game.completedCount.value).toBe(1)
    expect(game.targetMidi.value).not.toBe(null)
  })

  test('should complete game after the default number of rounds', async () => {
    const mock = createMockPitchDetection()
    const holdMs = 100
    const game = mountGame({
      pitchDetection: mock.provider,
      midiMin: MIDI_MIN,
      midiMax: MIDI_MAX,
      holdDurationMs: holdMs,
    })

    await game.start()

    for (let i = 0; i < DEFAULT_TOTAL_ROUNDS; i++) {
      advanceRAF(DEAF_PERIOD_MS + 50)
      const target = game.targetMidi.value!
      simulateSingingMidi(mock, target)
      await nextTick()
      advanceRAF(holdMs + 50)
    }

    expect(game.isComplete.value).toBe(true)
    expect(game.completedCount.value).toBe(DEFAULT_TOTAL_ROUNDS)
  })

  test('should replay a fresh round from complete without passing through idle', async () => {
    const mock = createMockPitchDetection()
    const holdMs = 100
    const game = mountGame({
      pitchDetection: mock.provider,
      midiMin: MIDI_MIN,
      midiMax: MIDI_MAX,
      holdDurationMs: holdMs,
    })

    await game.start()
    for (let i = 0; i < DEFAULT_TOTAL_ROUNDS; i++) {
      advanceRAF(DEAF_PERIOD_MS + 50)
      simulateSingingMidi(mock, game.targetMidi.value!)
      await nextTick()
      advanceRAF(holdMs + 50)
    }
    expect(game.phase.value).toBe('complete')

    const phases: string[] = []
    const stopWatching = watch(game.phase, (phase) => phases.push(phase), {
      flush: 'sync',
    })
    await game.start()
    stopWatching()

    expect(phases).toEqual(['playing'])
    expect(game.completedCount.value).toBe(0)
    expect(game.holdTimeMs.value).toBe(0)
    expect(game.elapsedMs.value).toBe(0)
  })

  test('should reset all state on stop()', async () => {
    const mock = createMockPitchDetection()
    const game = mountGame({
      pitchDetection: mock.provider,
      midiMin: MIDI_MIN,
      midiMax: MIDI_MAX,
    })

    await game.start()
    advanceRAF(DEAF_PERIOD_MS + 50)

    const target = game.targetMidi.value!
    simulateSingingMidi(mock, target)
    await nextTick()
    advanceRAF(200)

    game.stop()

    expect(game.isStarted.value).toBe(false)
    expect(game.targetMidi.value).toBe(null)
    expect(game.completedCount.value).toBe(0)
    expect(game.holdTimeMs.value).toBe(0)
    expect(game.elapsedMs.value).toBe(0)
    expect(game.isComplete.value).toBe(false)
  })

  test('should advance after the hold duration set via setHoldDuration', async () => {
    const mock = createMockPitchDetection()
    /* Well under the default hold, which would not have advanced yet. */
    const holdMs = 200
    const game = mountGame({
      pitchDetection: mock.provider,
      midiMin: MIDI_MIN,
      midiMax: MIDI_MAX,
    })

    game.setHoldDuration(holdMs)
    await game.start()
    advanceRAF(DEAF_PERIOD_MS + 50)
    simulateSingingMidi(mock, game.targetMidi.value!)
    await nextTick()

    advanceRAF(holdMs + 50)

    expect(game.completedCount.value).toBe(1)
  })

  test('should stop the round and draw the next target from the range set via setMidiRange', async () => {
    const mock = createMockPitchDetection()
    const game = mountGame({
      pitchDetection: mock.provider,
      midiMin: MIDI_MIN,
      midiMax: MIDI_MAX,
    })
    await game.start()

    /* C6–D6, clear of the C3–C5 the round started in */
    game.setMidiRange(84, 86)

    expect(game.isStarted.value).toBe(false)
    expect(game.targetMidi.value).toBe(null)

    await game.start()

    expect(game.targetMidi.value).toBeGreaterThanOrEqual(84)
    expect(game.targetMidi.value).toBeLessThanOrEqual(86)
  })

  test('should ignore pitch matches during deaf period after start', async () => {
    const mock = createMockPitchDetection()
    const holdMs = 200
    const game = mountGame({
      pitchDetection: mock.provider,
      midiMin: MIDI_MIN,
      midiMax: MIDI_MAX,
      holdDurationMs: holdMs,
    })

    await game.start()

    const target = game.targetMidi.value!
    simulateSingingMidi(mock, target)
    await nextTick()

    expect(game.isDeaf.value).toBe(true)
    expect(game.isSingingCorrectNote.value).toBe(false)

    /* Hold should not accumulate during deaf period */
    advanceRAF(DEAF_PERIOD_MS - 50)
    expect(game.holdTimeMs.value).toBe(0)
  })

  test('should start matching after deaf period expires', async () => {
    const mock = createMockPitchDetection()
    const holdMs = 500
    const game = mountGame({
      pitchDetection: mock.provider,
      midiMin: MIDI_MIN,
      midiMax: MIDI_MAX,
      holdDurationMs: holdMs,
    })

    await game.start()

    /* Advance past the deaf period */
    advanceRAF(DEAF_PERIOD_MS + 50)

    const target = game.targetMidi.value!
    simulateSingingMidi(mock, target)
    await nextTick()

    expect(game.isDeaf.value).toBe(false)
    expect(game.isSingingCorrectNote.value).toBe(true)

    advanceRAF(200)
    expect(game.holdTimeMs.value).toBeGreaterThan(0)
  })

  test('should apply deaf period after advancing to next round', async () => {
    const mock = createMockPitchDetection()
    const holdMs = 100
    const game = mountGame({
      pitchDetection: mock.provider,
      midiMin: MIDI_MIN,
      midiMax: MIDI_MAX,
      holdDurationMs: holdMs,
    })

    await game.start()

    /* Wait out deaf period, sing correct note, complete round 1 */
    advanceRAF(DEAF_PERIOD_MS + 50)
    const target1 = game.targetMidi.value!
    simulateSingingMidi(mock, target1)
    await nextTick()
    advanceRAF(holdMs + 50)

    expect(game.completedCount.value).toBe(1)

    /* Immediately after advancing, deaf period should be active again */
    expect(game.isDeaf.value).toBe(true)
    expect(game.isSingingCorrectNote.value).toBe(false)
  })

  test('should activate deaf period on triggerDeafPeriod()', async () => {
    const mock = createMockPitchDetection()
    const holdMs = 500
    const game = mountGame({
      pitchDetection: mock.provider,
      midiMin: MIDI_MIN,
      midiMax: MIDI_MAX,
      holdDurationMs: holdMs,
    })

    await game.start()

    /* Wait out the initial deaf period */
    advanceRAF(DEAF_PERIOD_MS + 50)
    expect(game.isDeaf.value).toBe(false)

    /* Singing correct note should work */
    const target = game.targetMidi.value!
    simulateSingingMidi(mock, target)
    await nextTick()
    expect(game.isSingingCorrectNote.value).toBe(true)

    /* Trigger deaf period (simulates user clicking a tone button) */
    game.triggerDeafPeriod()

    /* Now deaf — correct note should be ignored */
    expect(game.isDeaf.value).toBe(true)
    expect(game.isSingingCorrectNote.value).toBe(false)
  })

  test('should not activate deaf period when game is not started', () => {
    const mock = createMockPitchDetection()
    const game = mountGame({
      pitchDetection: mock.provider,
      midiMin: MIDI_MIN,
      midiMax: MIDI_MAX,
    })

    game.triggerDeafPeriod()
    expect(game.isDeaf.value).toBe(false)
  })
})

describe('useSingTone - skip', () => {
  const MIDI_MIN = 48
  const MIDI_MAX = 72

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    while (wrappers.length) wrappers.pop()!.unmount()
    vi.useRealTimers()
  })

  async function startGame(options: singToneOptions = {}) {
    const mock = createMockPitchDetection()
    const game = mountGame({
      pitchDetection: mock.provider,
      midiMin: MIDI_MIN,
      midiMax: MIDI_MAX,
      ...options,
    })
    await game.start()

    return { mock, game }
  }

  test('should unlock skip only after SKIP_UNLOCK_MS on the same tone', async () => {
    const { game } = await startGame()

    advanceRAF(SKIP_UNLOCK_MS - 100)
    expect(game.isSkipAvailable.value).toBe(false)

    advanceRAF(200)
    expect(game.isSkipAvailable.value).toBe(true)
  })

  test('should ignore skip before it unlocks', async () => {
    const { game } = await startGame()
    const firstTarget = game.targetMidi.value

    advanceRAF(1000)
    game.skip()

    expect(game.completedCount.value).toBe(0)
    expect(game.skippedCount.value).toBe(0)
    expect(game.targetMidi.value).toBe(firstTarget)
  })

  test('should use up the round without scoring and pick a new tone', async () => {
    const { game } = await startGame()
    const firstTarget = game.targetMidi.value

    advanceRAF(SKIP_UNLOCK_MS + 100)
    game.skip()

    expect(game.completedCount.value).toBe(1)
    expect(game.skippedCount.value).toBe(1)
    expect(game.targetMidi.value).not.toBe(firstTarget)
    expect(game.isSkipAvailable.value).toBe(false)
    expect(game.isPlaying.value).toBe(true)
  })

  test('should complete the game when the last round is skipped', async () => {
    const { game } = await startGame({ totalRounds: 2 })

    for (let i = 0; i < 2; i++) {
      advanceRAF(SKIP_UNLOCK_MS + 100)
      game.skip()
    }

    expect(game.isComplete.value).toBe(true)
    expect(game.completedCount.value).toBe(2)
    expect(game.skippedCount.value).toBe(2)
    expect(game.isSkipAvailable.value).toBe(false)
  })

  test('should restart the unlock countdown after a matched tone', async () => {
    const holdMs = 100
    const { mock, game } = await startGame({ holdDurationMs: holdMs })

    advanceRAF(SKIP_UNLOCK_MS - 500)
    simulateSingingMidi(mock, game.targetMidi.value!)
    await nextTick()
    advanceRAF(holdMs + 50)

    expect(game.completedCount.value).toBe(1)
    expect(game.skippedCount.value).toBe(0)

    advanceRAF(1000)
    expect(game.isSkipAvailable.value).toBe(false)
  })

  test('should clear the skip count on stop', async () => {
    const { game } = await startGame()

    advanceRAF(SKIP_UNLOCK_MS + 100)
    game.skip()
    game.stop()

    expect(game.skippedCount.value).toBe(0)
  })
})
