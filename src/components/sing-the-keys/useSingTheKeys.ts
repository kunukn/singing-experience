import { useMachine } from '@xstate/vue'
import type { ToneEngine } from '@/composables/toneEngine'
import {
  defaultToneEngine,
  TONE_MODE_RELEASE_S,
} from '@/composables/toneEngine'
import { midiToFrequency } from '@/utils/noteUtils'
import { singTheKeysMachine, type SingTheKeysPhase } from './singTheKeysMachine'
import type { Song } from './singTheKeysSongs'
import {
  activeNoteIndexAt,
  buildTimeline,
  endingLaneMsAt,
  laneEndViewMs,
  LOOKAHEAD_MS,
  SCORE_LAG_MS,
  type Timeline,
} from './singTheKeysTimeline'

/* Articulation gap — each guide note sounds for 92% of its written duration so
 * adjacent notes are clearly separated rather than blending into a slur. */
const ARTICULATION = 0.92

/* Small audio-clock offset to compensate for JS → Web Audio scheduling
 * latency so the first scheduled guide note is not clipped. */
const SCHEDULE_AHEAD_S = 0.05

/* How far ahead of the audio clock the metronome is queued each frame: far
 * enough to ride out a few slow frames, short enough that switching it off is
 * heard within a beat. */
const METRONOME_LOOKAHEAD_S = 0.1

/* How long after a thud starts the mic may still hear it: 30 ms of thud, 43 ms
 * more for it to leave the detector's 2048-sample window, and the rest for
 * speaker and mic latency and the room's ring. */
const THUD_MASK_S = 0.22

/* The mask opens a little early, so no detector frame falls between the thud
 * sounding and the next animation frame noticing. */
const THUD_MASK_LEAD_S = 0.03

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
  /* Let the first blocks fall in for LOOKAHEAD_MS before note 0, so a singer
   * can get ready. Off, the song starts at once from the idle preview's view. */
  hasLeadIn: boolean
}

export type SingTheKeysResult = ReturnType<typeof useSingTheKeys>

type Options = {
  /* Injectable for tests; defaults to the app's shared Tone.js engine. */
  toneEngine?: ToneEngine
  /* Sound a thud on every beat line, in a scored run and a preview alike. A
   * ref, not a start param, so it can be flipped mid-run. */
  isMetronomeEnabled?: Readonly<Ref<boolean>>
}

/*
 * Drives one Sing the Keys run. The Tone.js audio clock is the single time
 * source: the guide notes and the metronome are scheduled on it, and the lane's
 * `elapsedMs` is read back from it every animation frame, so the falling
 * blocks and the sound cannot drift apart. `activeNoteIndex` is derived from
 * the same `elapsedMs`, so the key highlight, the lane and the scorer always
 * agree on which note is due.
 *
 * `elapsedMs` counts from the song's first note: it is negative during the
 * LOOKAHEAD_MS lead-in while the first blocks fall in (a run started without
 * one begins at 0), and sits at 0 while idle so the lane shows the opening of
 * the tune as a still preview.
 * `laneElapsedMs` is what the lane draws: the same clock while playing. After a
 * natural finish it keeps falling while the last note still sounds, then
 * glides back to the song's last stretch so the ending (and its hits and
 * misses) stays in view — see endingLaneMsAt.
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
  /* True from a natural finish until the next preview, start or stop: the lane
   * is showing the ending, so every note in it has already been sung. */
  const isShowingEnding = ref(false)

  const laneElapsedMs = ref(0)
  /* True once the ending glide has landed: the lane is at rest on the ending
   * view, so blocks left part-way past the hit line can be clipped there. */
  const isEndingSettled = ref(false)

  const activeNoteIndex = computed(() =>
    isPlaying.value
      ? activeNoteIndexAt(timeline.value.notes, elapsedMs.value)
      : null,
  )

  /* The note the pitch arriving now belongs to: the one that was due
   * SCORE_LAG_MS ago. The scorer keys on this, the lane and keys on
   * activeNoteIndex. The run ends with the song, so the last note alone is
   * judged on a window that much shorter. */
  const scoredNoteIndex = computed(() =>
    isPlaying.value
      ? activeNoteIndexAt(timeline.value.notes, elapsedMs.value - SCORE_LAG_MS)
      : null,
  )

  /* Sounding duration of each note in ms — the scorer's dwell thresholds and
   * its denominator come from this. */
  const noteDurationsMs = computed(() =>
    timeline.value.notes.map((note) => note.durationMs),
  )

  /* Audio-clock second at which elapsedMs reads 0: the song's first note. */
  let songStartS = 0
  let rafId: number | null = null
  let endingPath = { fallEndMs: 0, endingViewMs: 0 }

  /* On the immediate clock, the one the speaker is on. getNow() runs Tone's
   * 100 ms look-ahead early: read from it, every block and beat line reached
   * the hit line 100 ms before its tone or thud sounded. */
  function readElapsedMs() {
    return (engine.getImmediate() - songStartS) * 1000
  }

  /* The first beat line the metronome has not yet looked at. */
  let nextMetronomeLineIndex = 0

  /* True while a thud may be in the mic's signal (see THUD_MASK_S), so the
   * display can keep it out of the sung pitch — see useMetronomeMask. */
  const isMetronomeSounding = ref(false)
  /* Audio-clock times of the thuds queued and not yet died away. */
  let thudTimesS: number[] = []

  /* On the immediate clock: getNow() runs Tone's look-ahead early, and the
   * mask has to follow what the speaker is actually playing. */
  function updateMetronomeSounding() {
    const immediateS = engine.getImmediate()
    thudTimesS = thudTimesS.filter((whenS) => immediateS <= whenS + THUD_MASK_S)
    isMetronomeSounding.value = thudTimesS.some(
      (whenS) => immediateS >= whenS - THUD_MASK_LEAD_S,
    )
  }

  function clearMetronomeMask() {
    thudTimesS = []
    isMetronomeSounding.value = false
  }

  /* Queues the thud for every beat line coming due within the look-ahead. Run
   * each frame instead of once for the whole song, so the toggle works mid-run:
   * off, nothing more is queued; on, it joins at the next line. Two kinds of
   * line stay silent: those already behind the clock (the lead-in lines of a
   * run started without one) and the closing line at totalMs, where the song
   * is over. */
  function scheduleDueMetronome() {
    const { beatLines, totalMs } = timeline.value
    const nowS = engine.getNow()

    while (nextMetronomeLineIndex < beatLines.length) {
      const line = beatLines[nextMetronomeLineIndex]
      if (!line) break

      const whenS = songStartS + line.ms / 1000
      if (whenS > nowS + METRONOME_LOOKAHEAD_S) break

      nextMetronomeLineIndex++
      /* 1 ms of slack: the closing line is built from pulse lengths, so
       * rounding can leave it a hair short of totalMs. */
      const isDue = whenS >= nowS && line.ms < totalMs - 1
      if (isDue && options.isMetronomeEnabled?.value) {
        engine.playThudAt(whenS)
        thudTimesS.push(whenS)
      }
    }
  }

  function tick() {
    scheduleDueMetronome()
    updateMetronomeSounding()
    elapsedMs.value = readElapsedMs()
    laneElapsedMs.value = elapsedMs.value
    rafId = requestAnimationFrame(tick)
  }

  /* After DONE: the lane alone moves on; elapsedMs stays frozen at the finish
   * for the scorer and the tally. */
  function tickEnding() {
    const { laneMs, isSettled } = endingLaneMsAt(readElapsedMs(), endingPath)
    laneElapsedMs.value = laneMs
    if (isSettled) {
      isEndingSettled.value = true
      rafId = null

      return
    }

    rafId = requestAnimationFrame(tickEnding)
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

    stopTicking()
    timeline.value = buildTimeline(song, tonicMidi, speed)
    elapsedMs.value = 0
    laneElapsedMs.value = 0
    isShowingEnding.value = false
    isEndingSettled.value = false
  }

  async function start(params: SingTheKeysStartParams) {
    await engine.warmUp()
    engine.cancelScheduled()
    stopTicking()

    const built = buildTimeline(params.song, params.tonicMidi, params.speed)
    timeline.value = built
    isShowingEnding.value = false
    isEndingSettled.value = false

    /* The lane falls on while there is still sound: with the guide on, until
     * the last tone's release has died away; with it off, the singer's own
     * note ends with the song. */
    const lastNote = built.notes.at(-1)
    const lastToneEndMs =
      params.isMelodyGuideEnabled && lastNote
        ? lastNote.startMs +
          lastNote.durationMs * ARTICULATION +
          TONE_MODE_RELEASE_S[engine.toneMode.value] * 1000
        : 0
    endingPath = {
      fallEndMs: Math.max(built.totalMs, lastToneEndMs),
      endingViewMs: laneEndViewMs(built.totalMs),
    }

    const leadInMs = params.hasLeadIn ? LOOKAHEAD_MS : 0
    songStartS = engine.getNow() + SCHEDULE_AHEAD_S + leadInMs / 1000

    if (params.isMelodyGuideEnabled) {
      for (const note of built.notes) {
        engine.playToneAt(
          midiToFrequency(note.midi),
          (note.durationMs / 1000) * ARTICULATION,
          songStartS + note.startMs / 1000,
        )
      }
    }

    /* Here as well as in tick, so a line due at once (the first beat of a run
     * without lead-in) is not left waiting for the first frame. */
    nextMetronomeLineIndex = 0
    clearMetronomeMask()
    scheduleDueMetronome()

    engine.scheduleDraw(
      () => {
        stopTicking()
        clearMetronomeMask()
        elapsedMs.value = readElapsedMs()
        isShowingEnding.value = true
        send({ type: 'DONE' })
        tickEnding()
      },
      songStartS + built.totalMs / 1000,
    )

    /* From the clock, not a flat −leadInMs: the clock starts SCHEDULE_AHEAD_S
     * in the future, so the flat value would sit on the first count-in beat
     * line and the first frame would jump back off it. */
    elapsedMs.value = readElapsedMs()
    laneElapsedMs.value = elapsedMs.value
    send({ type: 'START' })
    rafId = requestAnimationFrame(tick)
  }

  /* Scroll range for browsing the song while not playing: the opening view
   * up to the ending view. */
  const laneScrollMaxMs = computed(() => laneEndViewMs(timeline.value.totalMs))

  /* Idle, or done once the ending glide has landed — mid-glide its rAF would
   * overwrite the scroll on the next frame. */
  const canScrollLane = computed(
    () => !isPlaying.value && (!isShowingEnding.value || isEndingSettled.value),
  )

  /* Moves the lane only: elapsedMs stays where it is (0 in the preview, the
   * finish after a run) for the scorer and the tally. preview, start and stop
   * all put the lane back, so a scroll never outlives its song. */
  function scrollLaneTo(ms: number) {
    if (!canScrollLane.value) return

    laneElapsedMs.value = Math.min(laneScrollMaxMs.value, Math.max(0, ms))
  }

  function stop() {
    engine.cancelScheduled()
    stopTicking()
    clearMetronomeMask()
    elapsedMs.value = 0
    laneElapsedMs.value = 0
    isShowingEnding.value = false
    isEndingSettled.value = false
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
    isShowingEnding,
    isEndingSettled,
    laneElapsedMs,
    activeNoteIndex,
    scoredNoteIndex,
    noteDurationsMs,
    laneScrollMaxMs,
    canScrollLane,
    isMetronomeSounding,
    preview,
    start,
    stop,
    scrollLaneTo,
  }
}
