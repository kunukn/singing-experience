import { mount } from '@vue/test-utils'
import type { NoteInfo } from '@/utils/noteUtils'
import { midiToFrequency, midiToNoteLabel } from '@/utils/noteUtils'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { h } from 'vue'
import type { PitchDetectionProvider, singToneOptions } from './useSingTone'
import {
  DEAF_PERIOD_MS,
  GRACE_PERIOD_MS,
  MAX_CENTS_DEVIATION,
  DEFAULT_TOTAL_ROUNDS,
  useSingTone,
} from './useSingTone'

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
    setIsClean: (clean: boolean) => {
      isClean.value = clean
    },
    setIsListening: (listening: boolean) => {
      isListening.value = listening
    },
  }
}

function simulateSingingMidi(
  mock: ReturnType<typeof createMockPitchDetection>,
  midi: number,
  centsOffset = 0,
) {
  const baseFreq = midiToFrequency(midi)
  const freq = baseFreq * Math.pow(2, centsOffset / 1200)
  const { note, octave } = midiToNoteLabel(midi)

  mock.setFrequency(freq)
  mock.setNoteInfo({
    note,
    octave,
    cents: centsOffset,
    midiNote: midi,
    frequency: freq,
  })
  mock.setIsClean(true)
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
    expect(game.targetMidi.value).toBeGreaterThanOrEqual(MIDI_MIN)
    expect(game.targetMidi.value).toBeLessThanOrEqual(MIDI_MAX)
  })

  test('should generate target within midi range', async () => {
    const mock = createMockPitchDetection()
    const game = mountGame({
      pitchDetection: mock.provider,
      midiMin: MIDI_MIN,
      midiMax: MIDI_MAX,
    })

    await game.start()

    for (let i = 0; i < 20; i++) {
      const midi = game.targetMidi.value!
      expect(midi).toBeGreaterThanOrEqual(MIDI_MIN)
      expect(midi).toBeLessThanOrEqual(MIDI_MAX)
      game.reset()
      await game.start()
    }
  })

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

  test('should reject note when not clean', async () => {
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
    mock.setIsClean(false)
    await nextTick()

    expect(game.isSingingCorrectNote.value).toBe(false)
  })

  test('should reject note when cents deviation exceeds threshold', async () => {
    const mock = createMockPitchDetection()
    const game = mountGame({
      pitchDetection: mock.provider,
      midiMin: MIDI_MIN,
      midiMax: MIDI_MAX,
    })

    await game.start()
    advanceRAF(DEAF_PERIOD_MS + 50)

    const target = game.targetMidi.value!
    simulateSingingMidi(mock, target, MAX_CENTS_DEVIATION + 10)
    await nextTick()

    expect(game.isSingingCorrectNote.value).toBe(false)
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

    mock.setIsClean(false)
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

  test('should complete game after 8 rounds', async () => {
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

  test('should update hold duration via setHoldDuration', () => {
    const mock = createMockPitchDetection()
    const game = mountGame({
      pitchDetection: mock.provider,
      midiMin: MIDI_MIN,
      midiMax: MIDI_MAX,
    })

    game.setHoldDuration(2000)
    expect(game.holdDurationMs.value).toBe(2000)
  })

  test('should update midi range via setMidiRange', () => {
    const mock = createMockPitchDetection()
    const game = mountGame({
      pitchDetection: mock.provider,
      midiMin: MIDI_MIN,
      midiMax: MIDI_MAX,
    })

    game.setMidiRange(60, 84)
    expect(game.midiMin.value).toBe(60)
    expect(game.midiMax.value).toBe(84)
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
