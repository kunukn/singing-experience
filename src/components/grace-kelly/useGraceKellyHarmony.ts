import { midiToFrequency } from '@/utils/noteUtils'
import type { ToneEngine } from '@/composables/toneEngine'
import { defaultToneEngine } from '@/composables/toneEngine'
import { DEFAULT_BPM } from './graceKellyConstants'
import { graceKellyMachine, type GraceKellyPhase } from './graceKellyMachine'
import { VOZ_MELODIES } from './graceKellyMelodies'
import { useMachine } from '@xstate/vue'

/* Articulation gap — each note sounds for 92% of its written duration so
 * adjacent notes are clearly separated rather than blending into a slur. */
const ARTICULATION = 0.92

/* Small audio-clock offset to compensate for JS → Web Audio scheduling
 * latency so the first note is not clipped. */
const SCHEDULE_AHEAD_S = 0.05

export type GraceKellyHarmonyResult = ReturnType<typeof useGraceKellyHarmony>

type Options = {
  /* Injectable audio engine — defaults to the shared singleton. Tests pass a
   * mock to assert scheduling without touching Tone.js. */
  toneEngine?: ToneEngine
}

/* Multi-voice sibling of useGraceKelly: plays any subset of the six parts
 * together against one shared timeline. All melodies share the same 34-note
 * rhythm, so a single activeNoteIndex highlights every staff while each
 * selected voice contributes its own transposed pitch. */
export function useGraceKellyHarmony(options: Options = {}) {
  const { snapshot, send } = useMachine(graceKellyMachine)
  const engine = options.toneEngine ?? defaultToneEngine
  const {
    warmUp,
    getNow,
    scheduleDraw,
    cancelScheduled,
    setHarmonyVoiceCount,
    playHarmonyVoiceAt,
  } = engine

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
  let currentVozIndices: number[] = []
  let currentBpm = DEFAULT_BPM

  /* Schedules the highlight + audio for every note from `fromIndex` to the end,
   * against a single fresh audio-clock baseline so the visual highlight and the
   * sound stay locked together (every staff reads activeNoteIndex). Used by both
   * start() (fromIndex 0) and resume() (fromIndex = paused note). */
  function scheduleFrom(fromIndex: number) {
    /* All voices share one rhythm/length — the first melody is the timeline
     * reference that drives the single shared highlight. */
    const timeline = VOZ_MELODIES[0].notes

    /* Eighth-note duration for the chosen tempo (bpm = dotted quarter, the 6/8
     * beat unit): dotted quarter = 60/bpm s, split across 3 eighth notes. */
    const eighthSeconds = 60 / currentBpm / 3

    /* Pass A — schedule the highlight for every remaining notehead and build the
     * per-note timeline. Each note (including tied ones) highlights in turn. */
    let cursor = getNow() + SCHEDULE_AHEAD_S
    const noteStartTimes: number[] = []
    for (let index = fromIndex; index < timeline.length; index++) {
      noteStartTimes[index] = cursor
      const noteIndex = index
      scheduleDraw(() => {
        activeNoteIndex.value = noteIndex
      }, cursor)
      /* Advance past the note plus any trailing rest so the next note starts on
       * time even when this one is clipped short (restAfterEighths). */
      cursor +=
        (timeline[index].eighthNotes +
          (timeline[index].restAfterEighths ?? 0)) *
        eighthSeconds
    }
    const endCursor = cursor

    /* Pass B — schedule the audio for each selected voice on its own monophonic
     * pool voice (bounded polyphony — one voice per line). Merge a tied run of
     * same-pitch notes into a single sustained tone (no re-articulation across
     * the tie). A resume that lands mid-tie simply starts a fresh run at
     * fromIndex (re-articulated). */
    setHarmonyVoiceCount(currentVozIndices.length)
    currentVozIndices.forEach((vozIndex, voiceSlot) => {
      const notes = VOZ_MELODIES[vozIndex].notes
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
        playHarmonyVoiceAt(voiceSlot, freq, durationS, noteStartTimes[index])
        index = last + 1
      }
    })

    /* Transition to done and clear highlight after the last note expires */
    scheduleDraw(() => {
      activeNoteIndex.value = null
      send({ type: 'DONE' })
    }, endCursor)
  }

  async function start(
    startToneMidi: number,
    vozIndices: number[],
    bpm: number,
  ) {
    if (vozIndices.length === 0) return

    await warmUp()
    cancelScheduled()
    activeNoteIndex.value = null

    currentStartToneMidi = startToneMidi
    currentVozIndices = [...vozIndices]
    currentBpm = bpm

    scheduleFrom(0)
    send({ type: 'START' })
  }

  /* Freezes playback: cancels the queued highlights and audio (cancelScheduled
   * disposes the synths, cutting the sustaining notes) but keeps activeNoteIndex
   * lit so the current note stays highlighted on every staff while paused. */
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
