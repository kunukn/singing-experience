import { useMachine } from '@xstate/vue'
import type { Ref } from 'vue'
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

type Options = {
  /* Drive the visual timeline only — skip all audio scheduling so the sheet
   * advances on the BPM clock with no playback. Used by the "Sing live" tab,
   * where the singer supplies the sound. */
  silent?: boolean
  /* When this ref is true, play one metronome click per bar (on the downbeat)
   * plus a single one-beat count-in before the pickup. Read at schedule time.
   * Only the "Sing live" instance passes it. */
  metronomeEnabled?: Ref<boolean>
}

/* 6/8 beat math: a dotted-quarter pulse is 3 eighth notes; a bar is 2 pulses. */
const BEAT_EIGHTHS = 3
/* A single dotted-quarter beat of count-in, landing one beat before the pickup. */
const COUNT_IN_BEATS = 1

export function useGraceKelly(options: Options = {}) {
  const { snapshot, send } = useMachine(graceKellyMachine)
  const {
    warmUp,
    playToneAt,
    playClickAt,
    getNow,
    scheduleDraw,
    cancelScheduled,
  } = useTonePlayer()

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
    const melody = VOZ_MELODIES[currentVozIndex]
    const notes = melody.notes

    /* Eighth-note duration for the chosen tempo (bpm = dotted quarter, the 6/8
     * beat unit): dotted quarter = 60/bpm s, split across 3 eighth notes. */
    const eighthSeconds = 60 / currentBpm / 3

    /* When the metronome is on, delay the first note by a one-beat count-in so
     * the singer hears the tempo and entry before they have to sing. Only on a
     * fresh start — a resume picks up mid-stream with no lead-in. */
    const metronomeOn = options.metronomeEnabled?.value ?? false
    const withCountIn = metronomeOn && fromIndex === 0
    const countInS = withCountIn
      ? COUNT_IN_BEATS * BEAT_EIGHTHS * eighthSeconds
      : 0

    /* Pass A — schedule the highlight for every remaining notehead and build the
     * per-note timeline. Each note (including tied ones) highlights in turn. */
    let cursor = getNow() + SCHEDULE_AHEAD_S + countInS
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
      if (!options.silent) playToneAt(freq, durationS, noteStartTimes[index])

      index = last + 1
    }

    /* Metronome clicks — scheduled against the same noteStartTimes baseline so
     * each beat lands sample-locked to the highlights, never drifting. */
    if (metronomeOn) {
      scheduleMetronome(
        fromIndex,
        notes,
        eighthSeconds,
        noteStartTimes,
        withCountIn,
        melody.anacrusisEighths ?? 0,
      )
    }

    /* Transition to done and clear highlight after the last note expires */
    scheduleDraw(() => {
      activeNoteIndex.value = null
      send({ type: 'DONE' })
    }, endCursor)
  }

  /* Schedules the metronome for the remaining timeline: a one-beat count-in (on a
   * fresh start) then a single click per bar, on each downbeat. Beat times are
   * derived from the song's eighth grid so they line up with the notes
   * regardless of where a resume begins. */
  function scheduleMetronome(
    fromIndex: number,
    notes: (typeof VOZ_MELODIES)[number]['notes'],
    eighthSeconds: number,
    noteStartTimes: number[],
    withCountIn: boolean,
    anacrusisEighths: number,
  ) {
    /* Eighths elapsed from the song start up to (not including) note `upTo`. */
    const eighthsBefore = (upTo: number) => {
      let sum = 0
      for (let index = 0; index < upTo; index++) {
        sum += notes[index].eighthNotes + (notes[index].restAfterEighths ?? 0)
      }

      return sum
    }

    const startEighth = eighthsBefore(fromIndex)
    const totalEighths = eighthsBefore(notes.length)
    /* Audio-clock time of song eighth 0, back-computed so resume stays aligned. */
    const songStartS = noteStartTimes[fromIndex] - startEighth * eighthSeconds
    const barEighths = 2 * BEAT_EIGHTHS

    if (withCountIn) {
      for (let beat = 0; beat < COUNT_IN_BEATS; beat++) {
        const whenS =
          songStartS - (COUNT_IN_BEATS - beat) * BEAT_EIGHTHS * eighthSeconds
        playClickAt(whenS, beat === 0) // accent the first count-in beat
      }
    }

    /* One click per bar on the downbeat. Downbeats fall `anacrusisEighths` into
     * the grid, then every full bar; find the first one at or after the resume
     * point and step a bar at a time. */
    const downbeatPhase =
      ((anacrusisEighths % barEighths) + barEighths) % barEighths
    const firstDownbeat =
      startEighth +
      ((((downbeatPhase - startEighth) % barEighths) + barEighths) % barEighths)
    for (let e = firstDownbeat; e < totalEighths; e += barEighths) {
      playClickAt(songStartS + e * eighthSeconds, true) // every kept click is a bar downbeat
    }
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
