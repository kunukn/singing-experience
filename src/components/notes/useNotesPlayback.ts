import { useMachine } from '@xstate/vue'
import { midiToFrequency } from '@/utils/noteUtils'
import { DEFAULT_BPM } from './notesConstants'
import { notesMachine, type NotesPhase } from './notesMachine'

/* Articulation gap — each note sounds for 92% of its written duration so
 * adjacent notes are clearly separated rather than blending into a slur. */
const ARTICULATION = 0.92

/* Small audio-clock offset to compensate for JS → Web Audio scheduling latency
 * so the first note is not clipped. */
const SCHEDULE_AHEAD_S = 0.05

export type NotesPlaybackResult = ReturnType<typeof useNotesPlayback>

type Options = {
  /* Drive the visual timeline only — skip all audio scheduling so the sheet
   * advances on the BPM clock with no playback. Used by the "Sing live" tab,
   * where the singer supplies the sound. */
  silent?: boolean
}

/*
 * Plays a chromatic scale (absolute-MIDI array) as a sequence of quarter notes
 * in 4/4, highlighting each note in turn via activeNoteIndex. A simpler cousin
 * of useGraceKelly: every note is a plain quarter (no ties, rests, or
 * metronome), so the beat math is just BPM = quarter note.
 */
export function useNotesPlayback(options: Options = {}) {
  const { snapshot, send } = useMachine(notesMachine)
  const { warmUp, playToneAt, getNow, scheduleDraw, cancelScheduled } =
    useTonePlayer()

  const phase = computed<NotesPhase>(() => snapshot.value.value as NotesPhase)

  const isIdle = computed(() => phase.value === 'idle')
  const isPlaying = computed(() => phase.value === 'playing')
  const isPaused = computed(() => phase.value === 'paused')
  const isDone = computed(() => phase.value === 'done')

  const activeNoteIndex = ref<number | null>(null)

  /* Sequence parameters of the current play, retained so resume() can rebuild
   * the remaining timeline without the caller re-supplying them. */
  let currentMidis: number[] = []
  let currentBpm = DEFAULT_BPM

  /* Schedules the highlight + audio for every note from `fromIndex` to the end,
   * against a single fresh audio-clock baseline so the visual highlight and the
   * sound stay locked together. Used by both start() (0) and resume(). */
  function scheduleFrom(fromIndex: number) {
    /* BPM = quarter note (the 4/4 beat unit), so a quarter lasts 60/bpm s. */
    const quarterSeconds = 60 / currentBpm

    let cursor = getNow() + SCHEDULE_AHEAD_S
    for (let index = fromIndex; index < currentMidis.length; index++) {
      const noteIndex = index
      scheduleDraw(() => {
        activeNoteIndex.value = noteIndex
      }, cursor)

      if (!options.silent) {
        playToneAt(
          midiToFrequency(currentMidis[index]),
          quarterSeconds * ARTICULATION,
          cursor,
        )
      }

      cursor += quarterSeconds
    }

    /* Transition to done and clear the highlight after the last note expires. */
    scheduleDraw(() => {
      activeNoteIndex.value = null
      send({ type: 'DONE' })
    }, cursor)
  }

  async function start(midis: number[], bpm: number) {
    await warmUp()
    cancelScheduled()
    activeNoteIndex.value = null

    currentMidis = midis
    currentBpm = bpm

    scheduleFrom(0)
    send({ type: 'START' })
  }

  /* Freezes playback: cancels the queued highlights and audio but keeps
   * activeNoteIndex lit so the current note stays highlighted while paused. */
  function pause() {
    if (!isPlaying.value) return

    cancelScheduled()
    send({ type: 'PAUSE' })
  }

  /* Resumes from the note that was lit at pause time, rescheduling highlight and
   * audio together from one fresh baseline (re-articulates that note). */
  async function resume() {
    if (!isPaused.value) return

    await warmUp()
    cancelScheduled()

    const fromIndex = activeNoteIndex.value ?? 0
    scheduleFrom(fromIndex)
    send({ type: 'RESUME' })
  }

  function stop() {
    cancelScheduled()
    activeNoteIndex.value = null
    send({ type: 'STOP' })
  }

  onUnmounted(() => {
    cancelScheduled()
  })

  return {
    phase,
    isIdle,
    isPlaying,
    isPaused,
    isDone,
    activeNoteIndex,
    start,
    pause,
    resume,
    stop,
  }
}
