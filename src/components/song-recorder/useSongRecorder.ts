import { useMachine } from '@xstate/vue'
import { useRafFn } from '@vueuse/core'
import { frequencyToMidi, midiToFrequency } from '@/utils/noteUtils'
import { createNoteSegmenter, type NoteEvent } from './noteSegmenter'
import { gridUnitMs, quantizeNotes } from './quantizeNotes'
import { buildRecordingAbc, chooseClef } from './songRecorderAbc'
import {
  BEATS_PER_BAR,
  COUNT_IN_BARS,
  MAX_RECORDING_SECONDS,
  type Grid,
} from './songRecorderConstants'
import { songRecorderMachine } from './songRecorderMachine'

export type PitchDetectionInput = {
  frequency: Readonly<Ref<number | null>>
  isClean: Readonly<Ref<boolean>>
  error: Readonly<Ref<string | null>>
  start: () => void | Promise<void>
  stop: () => void
}

type Options = {
  detection: PitchDetectionInput
  bpm: Ref<number>
  grid: Ref<Grid>
  /* Click on every beat while recording. The count-in always clicks. */
  isClickEnabled: Ref<boolean>
}

/* Lead time before the first count-in click so the scheduler isn't late. */
const SCHEDULE_AHEAD_S = 0.1

/* Each note sounds for 92% of its written length so repeated pitches stay
 * audibly separate. */
const ARTICULATION = 0.92

export type SongRecorderResult = ReturnType<typeof useSongRecorder>

/*
 * Records a sung melody against a metronome and turns it into a sheet: a
 * one-bar count-in, then every animation frame's pitch goes to the note
 * segmenter; on stop the raw notes are kept so the sheet can be re-quantized
 * (grid change) without singing again. Also plays the result back with the
 * active sheet element highlighted.
 */
export function useSongRecorder(options: Options) {
  const { detection, bpm, grid, isClickEnabled } = options
  const { snapshot, send } = useMachine(songRecorderMachine)
  const {
    warmUp,
    playToneAt,
    playTickAt,
    getNow,
    getImmediate,
    scheduleDraw,
    cancelScheduled,
  } = useTonePlayer()

  const isIdle = computed(() => snapshot.value.matches('idle'))
  const isCountingIn = computed(() => snapshot.value.matches('countIn'))
  const isRecording = computed(() => snapshot.value.matches('recording'))
  const isReview = computed(() => snapshot.value.matches('review'))
  const isPlaying = computed(() =>
    snapshot.value.matches({ review: 'playing' }),
  )
  const isPaused = computed(() => snapshot.value.matches({ review: 'paused' }))

  /* Beat number shown by the pulse: counts down 4…1 in the count-in, then
   * 1…4 within each bar while recording; null otherwise. */
  const countInBeat = ref<number | null>(null)
  const beatInBar = ref<number | null>(null)

  const elapsedMs = ref(0)
  const events = shallowRef<NoteEvent[]>([])

  const barSeconds = computed(() => (60 / bpm.value) * BEATS_PER_BAR)

  /* Whole bars only, so an auto-stopped take ends on a bar line. */
  const limitMs = computed(
    () =>
      Math.floor(MAX_RECORDING_SECONDS / barSeconds.value) *
      barSeconds.value *
      1000,
  )

  let segmenter = createNoteSegmenter()
  /* performance.now() at beat 1 of bar 1. */
  let originPerfMs = 0

  const sampler = useRafFn(
    () => {
      const timeMs = performance.now() - originPerfMs
      if (timeMs < 0) return

      elapsedMs.value = timeMs
      const frequency = detection.frequency.value
      const midi =
        detection.isClean.value && frequency !== null
          ? frequencyToMidi(frequency)
          : null
      segmenter.push(timeMs, midi)

      if (segmenter.events.length !== events.value.length) {
        events.value = [...segmenter.events]
      }
    },
    { immediate: false },
  )

  /* Draws trail the live singer (notes appear once closed); the clef follows
   * the melody's median pitch. */
  const clef = computed(() =>
    chooseClef(events.value.map((event) => event.midi)),
  )

  const quantized = computed(() =>
    quantizeNotes(events.value, {
      bpm: bpm.value,
      grid: grid.value,
      beatsPerBar: BEATS_PER_BAR,
    }),
  )

  const sheet = computed(() =>
    buildRecordingAbc(quantized.value, {
      bpm: bpm.value,
      grid: grid.value,
      beatsPerBar: BEATS_PER_BAR,
      clef: clef.value,
    }),
  )

  const hasNotes = computed(() => events.value.length > 0)

  /* Schedules the count-in clicks, the recording clicks (if enabled), the beat
   * pulse, the start of recording and the auto-stop, all on the audio clock. */
  function scheduleTake() {
    const beatSeconds = 60 / bpm.value
    const countInBeats = COUNT_IN_BARS * BEATS_PER_BAR
    const countInStart = getNow() + SCHEDULE_AHEAD_S
    const recordStart = countInStart + countInBeats * beatSeconds

    /* Audio clock → performance clock, so rAF samples share the click timeline. */
    originPerfMs = performance.now() + (recordStart - getImmediate()) * 1000

    for (let beat = 0; beat < countInBeats; beat++) {
      const when = countInStart + beat * beatSeconds
      playTickAt(when)
      scheduleDraw(() => {
        countInBeat.value = countInBeats - beat
      }, when)
    }

    scheduleDraw(() => {
      countInBeat.value = null
      send({ type: 'COUNT_IN_DONE' })
      sampler.resume()
    }, recordStart)

    const limitS = limitMs.value / 1000
    const recordingBeats = Math.round(limitS / beatSeconds)
    for (let beat = 0; beat < recordingBeats; beat++) {
      const when = recordStart + beat * beatSeconds
      if (isClickEnabled.value) playTickAt(when)
      scheduleDraw(() => {
        beatInBar.value = (beat % BEATS_PER_BAR) + 1
      }, when)
    }

    scheduleDraw(() => {
      if (isRecording.value) finishTake('LIMIT_REACHED')
    }, recordStart + limitS)
  }

  async function record() {
    if (!isIdle.value) return

    await warmUp()
    await detection.start()
    if (detection.error.value) return

    segmenter = createNoteSegmenter()
    events.value = []
    elapsedMs.value = 0
    cancelScheduled()
    send({ type: 'RECORD' })
    scheduleTake()
  }

  function finishTake(type: 'STOP' | 'LIMIT_REACHED') {
    sampler.pause()
    cancelScheduled()
    detection.stop()
    beatInBar.value = null
    events.value = [...segmenter.flush()]
    send({ type })
  }

  function stop() {
    if (isCountingIn.value) {
      cancelScheduled()
      detection.stop()
      countInBeat.value = null
      send({ type: 'STOP' })

      return
    }

    if (isRecording.value) finishTake('STOP')
  }

  /* Playback ------------------------------------------------------------ */

  const activePieceIndex = ref<number | null>(null)
  /* True once playback ran to the end — keeps the sheet scrolled there. */
  const hasPlayedToEnd = ref(false)

  function scheduleFrom(fromPiece: number) {
    const { pieces } = sheet.value
    const notes = quantized.value
    const unitSeconds = gridUnitMs(bpm.value, grid.value) / 1000
    const first = pieces[fromPiece]
    if (!first) return

    const base = getNow() + SCHEDULE_AHEAD_S - first.startUnit * unitSeconds

    pieces.slice(fromPiece).forEach((piece, offset) => {
      const pieceIndex = fromPiece + offset
      const when = base + piece.startUnit * unitSeconds
      scheduleDraw(() => {
        activePieceIndex.value = pieceIndex
      }, when)

      const note = notes[piece.noteIndex]
      const isNoteStart =
        offset === 0 || pieces[pieceIndex - 1]?.noteIndex !== piece.noteIndex
      if (piece.isRest || note.midi === null || !isNoteStart) return

      /* Tied pieces sound as one tone lasting the rest of the note. */
      const remainingUnits = note.startUnit + note.units - piece.startUnit
      playToneAt(
        midiToFrequency(note.midi),
        remainingUnits * unitSeconds * ARTICULATION,
        when,
      )
    })

    const last = pieces[pieces.length - 1]
    scheduleDraw(
      () => {
        activePieceIndex.value = null
        hasPlayedToEnd.value = true
        send({ type: 'PLAYBACK_DONE' })
      },
      base + (last.startUnit + last.units) * unitSeconds,
    )
  }

  async function play() {
    if (!isReview.value || isPlaying.value || isPaused.value) return

    await warmUp()
    cancelScheduled()
    activePieceIndex.value = null
    hasPlayedToEnd.value = false
    scheduleFrom(0)
    send({ type: 'PLAY' })
  }

  function pause() {
    if (!isPlaying.value) return

    cancelScheduled()
    send({ type: 'PAUSE' })
  }

  async function resume() {
    if (!isPaused.value) return

    await warmUp()
    cancelScheduled()
    scheduleFrom(activePieceIndex.value ?? 0)
    send({ type: 'RESUME' })
  }

  function stopPlayback() {
    cancelScheduled()
    activePieceIndex.value = null
    hasPlayedToEnd.value = false
    send({ type: 'STOP_PLAYBACK' })
  }

  function reset() {
    cancelScheduled()
    activePieceIndex.value = null
    hasPlayedToEnd.value = false
    events.value = []
    elapsedMs.value = 0
    send({ type: 'RESET' })
  }

  /* Mic refused or lost mid-take. */
  watch(detection.error, (error) => {
    if (!error || !(isCountingIn.value || isRecording.value)) return

    sampler.pause()
    cancelScheduled()
    countInBeat.value = null
    beatInBar.value = null
    send({ type: 'ERROR' })
  })

  onUnmounted(() => {
    sampler.pause()
    cancelScheduled()
    if (isCountingIn.value || isRecording.value) detection.stop()
  })

  return {
    isIdle,
    isCountingIn,
    isRecording,
    isReview,
    isPlaying,
    isPaused,
    countInBeat,
    beatInBar,
    elapsedMs,
    limitMs,
    events,
    hasNotes,
    clef,
    sheet,
    activePieceIndex,
    hasPlayedToEnd,
    record,
    stop,
    play,
    pause,
    resume,
    stopPlayback,
    reset,
  }
}
