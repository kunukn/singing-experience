import { useMachine } from '@xstate/vue'
import { midiToFrequency } from '@/utils/noteUtils'
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
  const isDone = computed(() => phase.value === 'done')

  const activeNoteIndex = ref<number | null>(null)

  async function start(startToneMidi: number, vozIndex: number, bpm: number) {
    await warmUp()
    cancelScheduled()
    activeNoteIndex.value = null

    const melody = VOZ_MELODIES[vozIndex]
    const notes = melody.notes

    /* Eighth-note duration for the chosen tempo (bpm = dotted quarter, the 6/8
     * beat unit): dotted quarter = 60/bpm s, split across 3 eighth notes. */
    const eighthSeconds = 60 / bpm / 3

    /* Pass A — schedule the highlight for every notehead and build the
     * per-note timeline. Each note (including tied ones) highlights in turn. */
    let cursor = getNow() + SCHEDULE_AHEAD_S
    const noteStartTimes: number[] = []
    for (let index = 0; index < notes.length; index++) {
      noteStartTimes[index] = cursor
      const noteIndex = index
      scheduleDraw(() => {
        activeNoteIndex.value = noteIndex
      }, cursor)
      cursor += notes[index].eighthNotes * eighthSeconds
    }
    const endCursor = cursor

    /* Pass B — schedule the audio, merging a tied run of same-pitch notes into
     * a single sustained tone (no re-articulation across the tie). */
    let index = 0
    while (index < notes.length) {
      let runEighths = notes[index].eighthNotes
      let last = index
      while (notes[last].tie && last + 1 < notes.length) {
        last++
        runEighths += notes[last].eighthNotes
      }
      const freq = midiToFrequency(startToneMidi + notes[index].midiOffset)
      const durationS = runEighths * eighthSeconds * ARTICULATION
      playToneAt(freq, durationS, noteStartTimes[index])
      index = last + 1
    }

    /* Transition to done and clear highlight after the last note expires */
    scheduleDraw(() => {
      activeNoteIndex.value = null
      send({ type: 'DONE' })
    }, endCursor)
    send({ type: 'START' })
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
    isDone,
    activeNoteIndex,
    start,
    stop,
  }
}
