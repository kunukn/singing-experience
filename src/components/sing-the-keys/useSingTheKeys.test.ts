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

  test('should play the first note as a start tone shortly into the lead-in', async () => {
    const { engine, game } = createGame()

    await game.start(startParams(false))

    expect(engine.playToneAt).toHaveBeenCalledTimes(1)
    expect(engine.playToneAt).toHaveBeenCalledWith(
      midiToFrequency(60),
      1,
      /* 0.6 s after the lead-in begins, not on the button press. */
      expect.closeTo(TONE_START_S + 0.6, 5),
    )
  })

  test('should end the start tone before the first note is due', async () => {
    const { engine, game } = createGame()

    await game.start(startParams(false))

    const [, durationS, whenS] = vi.mocked(engine.playToneAt).mock.calls[0]

    expect(whenS + durationS).toBeLessThan(SONG_START_S)
  })

  test('should schedule one guide tone per note when the guide is on', async () => {
    const { engine, game } = createGame()

    await game.start(startParams(true))

    /* The start tone first, then the three guide notes. */
    expect(engine.playToneAt).toHaveBeenCalledTimes(4)
    expect(engine.playToneAt).toHaveBeenNthCalledWith(
      2,
      midiToFrequency(60),
      expect.closeTo(0.6 * 0.92, 5),
      expect.closeTo(SONG_START_S, 5),
    )
    expect(engine.playToneAt).toHaveBeenNthCalledWith(
      4,
      midiToFrequency(64),
      expect.closeTo(1.2 * 0.92, 5),
      expect.closeTo(SONG_START_S + 1.2, 5),
    )
  })

  test('should play no melody notes when the guide is off', async () => {
    const { engine, game } = createGame()

    await game.start(startParams(false))

    /* Only the start tone, which sounds during the lead-in. */
    for (const [, , whenS] of vi.mocked(engine.playToneAt).mock.calls) {
      expect(whenS).toBeLessThan(SONG_START_S)
    }
  })

  test('should click every lead-in beat line, accenting bar starts', async () => {
    const { engine, game } = createGame()

    await game.start(startParams())

    /* 600 ms beat in 4/4 with no pickup: the 3 s lead-in holds five beats,
     * and the bar line two before the song ("4 | 1 2 3 4") is the accent. */
    const clicks = vi
      .mocked(engine.playClickAt)
      .mock.calls.map(([whenS, accent]) => [whenS - SONG_START_S, accent])
    const expected = [
      [-3, false],
      [-2.4, true],
      [-1.8, false],
      [-1.2, false],
      [-0.6, false],
    ]

    expect(clicks).toHaveLength(expected.length)
    clicks.forEach(([offsetS, accent], index) => {
      expect(offsetS).toBeCloseTo(expected[index][0] as number, 5)
      expect(accent).toBe(expected[index][1])
    })
  })

  test('should not click once the song has started', async () => {
    const { engine, game } = createGame()

    await game.start(startParams())

    for (const [whenS] of vi.mocked(engine.playClickAt).mock.calls) {
      expect(whenS).toBeLessThan(SONG_START_S)
    }
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
