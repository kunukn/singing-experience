import { useMachine } from '@xstate/vue'
import { midiToFrequency } from '@/utils/noteUtils'
import { DEFAULT_BPM } from './graceKellyConstants'
import { graceKellyMachine, type GraceKellyPhase } from './graceKellyMachine'
import { VOZ_MELODIES } from './graceKellyMelodies'

/* Articulation gap — each note sounds for 92% of its written duration so
 * adjacent notes are clearly separated rather than blending into a slur. */
const ARTICULATION = 0.92

/* Small audio-clock offset to compensate for JS → Web Audio scheduling
 * latency so the first note is not clipped. */
const SCHEDULE_AHEAD_S = 0.05

export type GraceKellyResult = ReturnType<typeof useGraceKelly>

export function useGraceKelly() {
  const { snapshot, send } = useMachine(graceKellyMachine)
  const { warmUp, playToneAt, getNow, scheduleDraw, cancelScheduled } =
    useTonePlayer()

  const phase = computed<GraceKellyPhase>(
    () => snapshot.value.value as GraceKellyPhase,
  )

  const isIdle = computed(() => phase.value === 'idle')
  const isPlaying = computed(() => phase.value === 'playing')
  const isPaused = computed(() => phase.value === 'paused')
  const isDone = computed(() => phase.value === 'done')

  const activeNoteIndex = ref<number | null>(null)

  /* Sequence parameters of the current play, retained so resume() can rebuild
   * the remaining timeline without the caller re-supplying them. */
  let currentStartToneMidi = 0
  let currentVozIndex = 0
  let currentBpm = DEFAULT_BPM

  /* Schedules the highlight + audio for every note from `fromIndex` to the end,
   * against a single fresh audio-clock baseline so the visual highlight and the
   * sound stay locked together (both sheets read activeNoteIndex). Used by both
   * start() (fromIndex 0) and resume() (fromIndex = paused note). */
  function scheduleFrom(fromIndex: number) {
    const notes = VOZ_MELODIES[currentVozIndex].notes

    /* Eighth-note duration for the chosen tempo (bpm = dotted quarter, the 6/8
     * beat unit): dotted quarter = 60/bpm s, split across 3 eighth notes. */
    const eighthSeconds = 60 / currentBpm / 3

    /* Pass A — schedule the highlight for every remaining notehead and build the
     * per-note timeline. Each note (including tied ones) highlights in turn. */
    let cursor = getNow() + SCHEDULE_AHEAD_S
    const noteStartTimes: number[] = []
    for (let index = fromIndex; index < notes.length; index++) {
      noteStartTimes[index] = cursor
      const noteIndex = index
      scheduleDraw(() => {
        activeNoteIndex.value = noteIndex
      }, cursor)
      /* Advance past the note plus any trailing rest so the next note starts on
       * time even when this one is clipped short (restAfterEighths). */
      cursor +=
        (notes[index].eighthNotes + (notes[index].restAfterEighths ?? 0)) *
        eighthSeconds
    }
    const endCursor = cursor

    /* Pass B — schedule the audio, merging a tied run of same-pitch notes into
     * a single sustained tone (no re-articulation across the tie). A resume that
     * lands mid-tie simply starts a fresh run at fromIndex (re-articulated). */
    let index = fromIndex
    while (index < notes.length) {
      let runEighths = notes[index].eighthNotes
      let last = index
      while (notes[last].tie && last + 1 < notes.length) {
        last++
        runEighths += notes[last].eighthNotes
      }
      const freq = midiToFrequency(
        currentStartToneMidi + notes[index].midiOffset,
      )
      const durationS = runEighths * eighthSeconds * ARTICULATION
      playToneAt(freq, durationS, noteStartTimes[index])
      index = last + 1
    }

    /* Transition to done and clear highlight after the last note expires */
    scheduleDraw(() => {
      activeNoteIndex.value = null
      send({ type: 'DONE' })
    }, endCursor)
  }

  async function start(startToneMidi: number, vozIndex: number, bpm: number) {
    await warmUp()
    cancelScheduled()
    activeNoteIndex.value = null

    currentStartToneMidi = startToneMidi
    currentVozIndex = vozIndex
    currentBpm = bpm

    scheduleFrom(0)
    send({ type: 'START' })
  }

  /* Freezes playback: cancels the queued highlights and audio (cancelScheduled
   * disposes the synths, cutting the sustaining note) but keeps activeNoteIndex
   * lit so the current note stays highlighted on both sheets while paused. */
  function pause() {
    if (!isPlaying.value) return

    cancelScheduled()
    send({ type: 'PAUSE' })
  }

  /* Resumes from the start of the note that was lit at pause time, rescheduling
   * highlight and audio together from one fresh baseline (re-articulates that
   * note). Falls back to the start if nothing was active. */
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
