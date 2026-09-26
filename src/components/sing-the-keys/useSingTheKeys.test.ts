import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  vi,
  type Mock,
} from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { createMockToneEngine } from '@/composables/toneEngine.mock'
import { midiToFrequency } from '@/utils/noteUtils'
import type { Song } from './singTheKeysSongs'
import { LOOKAHEAD_MS } from './singTheKeysTimeline'
import { useSingTheKeys } from './useSingTheKeys'

const C4 = 60

/* Three notes at bpm 100 (600 ms beat): 600 + 300 + rest 300 + 1200 = 2400 ms. */
const song: Song = {
  id: 'twinkle',
  bpm: 100,
  notes: [
    { midiOffset: 0, beats: 1 },
    { midiOffset: 7, beats: 0.5, restAfterBeats: 0.5 },
    { midiOffset: 4, beats: 2 },
  ],
}

/* The mock engine's virtual clock starts at 0, so with SCHEDULE_AHEAD_S the
 * lead-in begins at 0.05 s and the first note lands at 3.05 s. */
const TONE_START_S = 0.05
const SONG_START_S = TONE_START_S + LOOKAHEAD_MS / 1000

/* useMachine starts its actor in onMounted, so the composable has to live in a
 * mounted component for the phase to move. */
function createGame(nowS = { value: 0 }) {
  const engine = createMockToneEngine({ getNow: vi.fn(() => nowS.value) })
  let game!: ReturnType<typeof useSingTheKeys>
  mount(
    defineComponent({
      setup() {
        game = useSingTheKeys({ toneEngine: engine })

        return () => null
      },
    }),
  )

  return { engine, game, nowS }
}

function startParams(isMelodyGuideEnabled = true) {
  return { song, tonicMidi: C4, speed: 1, isMelodyGuideEnabled }
}

describe('useSingTheKeys', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('should schedule one guide tone per note when the guide is on', async () => {
    const { engine, game } = createGame()

    await game.start(startParams(true))

    expect(engine.playToneAt).toHaveBeenCalledTimes(3)
    expect(engine.playToneAt).toHaveBeenNthCalledWith(
      1,
      midiToFrequency(60),
      expect.closeTo(0.6 * 0.92, 5),
      expect.closeTo(SONG_START_S, 5),
    )
    expect(engine.playToneAt).toHaveBeenNthCalledWith(
      3,
      midiToFrequency(64),
      expect.closeTo(1.2 * 0.92, 5),
      expect.closeTo(SONG_START_S + 1.2, 5),
    )
  })

  test('should stay silent when the guide is off', async () => {
    const { engine, game } = createGame()

    await game.start(startParams(false))

    expect(engine.playToneAt).not.toHaveBeenCalled()
  })

  test('should click once, one beat before the first note', async () => {
    const { engine, game } = createGame()

    await game.start(startParams())

    expect(engine.playClickAt).toHaveBeenCalledTimes(1)
    expect(engine.playClickAt).toHaveBeenCalledWith(
      expect.closeTo(SONG_START_S - 0.6, 5),
      true,
    )
  })

  test('should start in the lead-in and track the audio clock each frame', async () => {
    const { game, nowS } = createGame()

    await game.start(startParams())
    expect(game.isPlaying.value).toBe(true)
    expect(game.elapsedMs.value).toBe(-LOOKAHEAD_MS)
    expect(game.activeNoteIndex.value).toBeNull()

    nowS.value = SONG_START_S + 0.7
    vi.advanceTimersByTime(20)
    await nextTick()

    expect(game.elapsedMs.value).toBeCloseTo(700, 5)
    expect(game.activeNoteIndex.value).toBe(1)
  })

  test('should finish after the last note and reset the lane preview', async () => {
    const { game } = createGame()

    await game.start(startParams())
    vi.advanceTimersByTime((SONG_START_S + 2.4) * 1000 + 1)
    await nextTick()

    expect(game.isDone.value).toBe(true)
    expect(game.elapsedMs.value).toBe(0)
    expect(game.activeNoteIndex.value).toBeNull()
  })

  test('should cancel scheduled audio and return to idle on stop', async () => {
    const { engine, game } = createGame()

    await game.start(startParams())
    const cancelScheduled = engine.cancelScheduled as Mock
    cancelScheduled.mockClear()
    game.stop()

    expect(cancelScheduled).toHaveBeenCalledTimes(1)
    expect(game.isIdle.value).toBe(true)
    expect(game.elapsedMs.value).toBe(0)
  })

  test('should expose note durations for the scorer', async () => {
    const { game } = createGame()

    game.preview(song, C4, 1)

    expect(game.noteDurationsMs.value).toEqual([600, 300, 1200])
    expect(game.isIdle.value).toBe(true)
  })
})
