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
import { ENDING_GLIDE_MS, LOOKAHEAD_MS } from './singTheKeysTimeline'
import { useSingTheKeys } from './useSingTheKeys'

const C4 = 60

/* Three notes at bpm 100 (600 ms beat): 600 + 300 + rest 300 + 1200 = 2400 ms. */
const song: Song = {
  id: 'twinkle',
  bpm: 100,
  meter: { pulseBeats: 1, pulsesPerBar: 4, pickupBeats: 0 },
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

  test('should play no metronome clicks', async () => {
    const { engine, game } = createGame()

    await game.start(startParams(false))

    expect(engine.playClickAt).not.toHaveBeenCalled()
  })

  test('should start in the lead-in and track the audio clock each frame', async () => {
    const { game, nowS } = createGame()

    await game.start(startParams())
    expect(game.isPlaying.value).toBe(true)
    /* The clock is still SCHEDULE_AHEAD_S short of the lead-in's start. */
    expect(game.elapsedMs.value).toBeCloseTo(
      -LOOKAHEAD_MS - TONE_START_S * 1000,
      5,
    )
    expect(game.activeNoteIndex.value).toBeNull()

    nowS.value = SONG_START_S + 0.7
    vi.advanceTimersByTime(20)
    await nextTick()

    expect(game.elapsedMs.value).toBeCloseTo(700, 5)
    expect(game.activeNoteIndex.value).toBe(1)
  })

  test('should keep the lane on the clock through the last note', async () => {
    const { game, nowS } = createGame()

    await game.start(startParams())
    /* The last note starts at 1200 ms and is still being sung at 1800. */
    nowS.value = SONG_START_S + 1.8
    vi.advanceTimersByTime(20)
    await nextTick()

    expect(game.elapsedMs.value).toBeCloseTo(1800, 5)
    expect(game.laneElapsedMs.value).toBeCloseTo(1800, 5)
  })

  test('should fall on while the last guide tone rings, then glide back to the ending', async () => {
    const { game, nowS } = createGame()

    await game.start(startParams(true))
    nowS.value = SONG_START_S + 2.4
    vi.advanceTimersByTime((SONG_START_S + 2.4) * 1000 + 1)
    await nextTick()

    expect(game.isDone.value).toBe(true)
    expect(game.isShowingEnding.value).toBe(true)
    expect(game.isEndingSettled.value).toBe(false)
    expect(game.activeNoteIndex.value).toBeNull()

    /* The last tone ends at 1200 + 1200 × 0.92 = 2304 ms and the mock's
     * keyboard mode releases for 0.8 s more, so the sound stops at 3104 ms. */
    const fallEndMs = 1200 + 1200 * 0.92 + 800
    nowS.value = SONG_START_S + 3
    vi.advanceTimersByTime(20)
    await nextTick()

    expect(game.laneElapsedMs.value).toBeCloseTo(3000, 5)
    /* The scorer's clock stays on the finish. */
    expect(game.elapsedMs.value).toBeCloseTo(2400, 5)

    nowS.value = SONG_START_S + (fallEndMs + ENDING_GLIDE_MS / 2) / 1000
    vi.advanceTimersByTime(20)
    await nextTick()

    expect(game.laneElapsedMs.value).toBeGreaterThan(0)
    expect(game.laneElapsedMs.value).toBeLessThan(fallEndMs)
    expect(game.isEndingSettled.value).toBe(false)

    nowS.value = SONG_START_S + (fallEndMs + ENDING_GLIDE_MS) / 1000 + 0.05
    vi.advanceTimersByTime(20)
    await nextTick()

    /* A song shorter than the lane settles on its opening. */
    expect(game.laneElapsedMs.value).toBe(0)
    expect(game.isEndingSettled.value).toBe(true)
  })

  test('should glide back as soon as the song ends when the guide is off', async () => {
    const { game, nowS } = createGame()

    /* Half speed doubles the 2.4 s song to 4.8 s, longer than the lane. */
    await game.start({ ...startParams(false), speed: 0.5 })
    nowS.value = SONG_START_S + 4.8
    vi.advanceTimersByTime((SONG_START_S + 4.8) * 1000 + 1)
    await nextTick()

    expect(game.laneElapsedMs.value).toBeCloseTo(4800, 5)

    nowS.value = SONG_START_S + 4.8 + ENDING_GLIDE_MS / 1000 + 0.05
    vi.advanceTimersByTime(20)
    await nextTick()

    /* The last LOOKAHEAD_MS of the song fills the lane. */
    expect(game.laneElapsedMs.value).toBe(4800 - LOOKAHEAD_MS)
    expect(game.isEndingSettled.value).toBe(true)
  })

  test('should drop the glide when a setting changes mid-way', async () => {
    const { game, nowS } = createGame()

    await game.start(startParams(false))
    nowS.value = SONG_START_S + 2.4
    vi.advanceTimersByTime((SONG_START_S + 2.4) * 1000 + 1)
    nowS.value = SONG_START_S + 2.6
    vi.advanceTimersByTime(20)
    game.preview(song, C4, 1)

    nowS.value = SONG_START_S + 5
    vi.advanceTimersByTime(100)
    await nextTick()

    expect(game.laneElapsedMs.value).toBe(0)
    expect(game.isEndingSettled.value).toBe(false)
  })

  test('should go back to the opening preview after the ending', async () => {
    const { game, nowS } = createGame()

    await game.start(startParams())
    nowS.value = SONG_START_S + 2.4
    vi.advanceTimersByTime((SONG_START_S + 2.4) * 1000 + 1)
    await nextTick()
    game.preview(song, C4, 1)

    expect(game.elapsedMs.value).toBe(0)
    expect(game.laneElapsedMs.value).toBe(0)
    expect(game.isShowingEnding.value).toBe(false)
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
