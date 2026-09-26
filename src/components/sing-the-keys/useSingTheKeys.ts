import { useMachine } from '@xstate/vue'
import type { ToneEngine } from '@/composables/toneEngine'
import { defaultToneEngine } from '@/composables/toneEngine'
import { midiToFrequency } from '@/utils/noteUtils'
import { singTheKeysMachine, type SingTheKeysPhase } from './singTheKeysMachine'
import type { Song } from './singTheKeysSongs'
import {
  activeNoteIndexAt,
  buildTimeline,
  LOOKAHEAD_MS,
  type Timeline,
} from './singTheKeysTimeline'

/* Articulation gap — each guide note sounds for 92% of its written duration so
 * adjacent notes are clearly separated rather than blending into a slur. */
const ARTICULATION = 0.92

/* Small audio-clock offset to compensate for JS → Web Audio scheduling
 * latency so the count-in click is not clipped. */
const SCHEDULE_AHEAD_S = 0.05

/* s — how long the starting note sounds at the top of the lead-in: long
 * enough to catch the pitch, and over well before the first note is due
 * LOOKAHEAD_MS later, so it never plays into the scoring window. */
const START_TONE_S = 1

/* s — pause after Start before the starting note, so it doesn't land on the
 * button press. At 1× (600 ms beats) it falls on the second count-in click. */
const START_TONE_DELAY_S = 0.6

const EMPTY_TIMELINE: Timeline = {
  notes: [],
  totalMs: 0,
  beatMs: 0,
  beatLines: [],
}

export type SingTheKeysStartParams = {
  song: Song
  tonicMidi: number
  speed: number
  /* Play each note out loud as it reaches the hit line. */
  isMelodyGuideEnabled: boolean
}

export type SingTheKeysResult = ReturnType<typeof useSingTheKeys>

type Options = {
  /* Injectable for tests; defaults to the app's shared Tone.js engine. */
  toneEngine?: ToneEngine
}

/*
 * Drives one Sing the Keys run. The Tone.js audio clock is the single time
 * source: the guide notes and the count-in are scheduled on it, and the lane's
 * `elapsedMs` is read back from it every animation frame, so the falling
 * blocks and the sound cannot drift apart. `activeNoteIndex` is derived from
 * the same `elapsedMs`, so the key highlight, the lane and the scorer always
 * agree on which note is due.
 *
 * `elapsedMs` counts from the song's first note: it is negative during the
 * LOOKAHEAD_MS lead-in while the first blocks fall in, and sits at 0 while
 * idle or done so the lane shows the opening of the tune as a still preview.
 */
export function useSingTheKeys(options: Options = {}) {
  const engine = options.toneEngine ?? defaultToneEngine
  const { snapshot, send } = useMachine(singTheKeysMachine)

  const phase = computed<SingTheKeysPhase>(
    () => snapshot.value.value as SingTheKeysPhase,
  )
  const isIdle = computed(() => phase.value === 'idle')
  const isPlaying = computed(() => phase.value === 'playing')
  const isDone = computed(() => phase.value === 'done')

  const timeline = ref<Timeline>(EMPTY_TIMELINE)
  const elapsedMs = ref(0)

  const activeNoteIndex = computed(() =>
    isPlaying.value
      ? activeNoteIndexAt(timeline.value.notes, elapsedMs.value)
      : null,
  )

  /* Sounding duration of each note in ms — the scorer's dwell thresholds and
   * its denominator come from this. */
  const noteDurationsMs = computed(() =>
    timeline.value.notes.map((note) => note.durationMs),
  )

  /* Audio-clock second at which elapsedMs would read −LOOKAHEAD_MS. */
  let toneStartS = 0
  let rafId: number | null = null

  function readElapsedMs() {
    return (engine.getNow() - toneStartS) * 1000 - LOOKAHEAD_MS
  }

  function tick() {
    elapsedMs.value = readElapsedMs()
    rafId = requestAnimationFrame(tick)
  }

  function stopTicking() {
    if (rafId !== null) cancelAnimationFrame(rafId)

    rafId = null
  }

  /* Lays out the song for the chosen tonic and speed, previews it in the lane
   * (elapsedMs 0 = first note on the hit line). Called on every settings
   * change while idle so the singer sees the tune's shape before starting. */
  function preview(song: Song, tonicMidi: number, speed: number) {
    if (isPlaying.value) return

    timeline.value = buildTimeline(song, tonicMidi, speed)
    elapsedMs.value = 0
  }

  async function start(params: SingTheKeysStartParams) {
    await engine.warmUp()
    engine.cancelScheduled()
    stopTicking()

    const built = buildTimeline(params.song, params.tonicMidi, params.speed)
    timeline.value = built

    toneStartS = engine.getNow() + SCHEDULE_AHEAD_S
    const songStartS = toneStartS + LOOKAHEAD_MS / 1000

    /* Count-in: one click per lead-in beat line, so the singer hears the pulse
     * the lines show and a bar start rings as the accented "1". Stops when the
     * song starts. */
    for (const line of built.beatLines) {
      if (line.ms >= 0) break

      engine.playClickAt(songStartS + line.ms / 1000, line.isBarStart)
    }

    /* Starting pitch: the melody's first note, once, early in the lead-in, so
     * the singer has the key before the count-in runs out. Plays with the
     * guide off too — that is when the singer needs it most. */
    const firstNote = built.notes[0]
    if (firstNote) {
      engine.playToneAt(
        midiToFrequency(firstNote.midi),
        START_TONE_S,
        toneStartS + START_TONE_DELAY_S,
      )
    }

    if (params.isMelodyGuideEnabled) {
      for (const note of built.notes) {
        engine.playToneAt(
          midiToFrequency(note.midi),
          (note.durationMs / 1000) * ARTICULATION,
          songStartS + note.startMs / 1000,
        )
      }
    }

    engine.scheduleDraw(
      () => {
        stopTicking()
        elapsedMs.value = 0
        send({ type: 'DONE' })
      },
      songStartS + built.totalMs / 1000,
    )

    /* From the clock, not a flat −LOOKAHEAD_MS: the clock starts
     * SCHEDULE_AHEAD_S in the future, so the flat value would sit on the first
     * count-in beat line and the first frame would jump back off it. */
    elapsedMs.value = readElapsedMs()
    send({ type: 'START' })
    rafId = requestAnimationFrame(tick)
  }

  function stop() {
    engine.cancelScheduled()
    stopTicking()
    elapsedMs.value = 0
    send({ type: 'STOP' })
  }

  onUnmounted(() => {
    engine.cancelScheduled()
    stopTicking()
  })

  return {
    phase,
    isIdle,
    isPlaying,
    isDone,
    timeline,
    elapsedMs,
    activeNoteIndex,
    noteDurationsMs,
    preview,
    start,
    stop,
  }
}
