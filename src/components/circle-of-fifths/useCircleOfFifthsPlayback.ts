import type { ToneEngine } from '@/composables/toneEngine'
import {
  defaultToneEngine,
  TONE_MODE_RELEASE_S,
} from '@/composables/toneEngine'
import { midiToFrequency } from '@/utils/noteUtils'

/* Long enough to hear the pitch, short enough that the singer can start soon */
const REFERENCE_TONE_S = 0.6
const TRIAD_S = 0.8
/* Time between cadence chords — roughly 100 BPM */
const CHORD_INTERVAL_S = 0.6
/* Slightly shorter than the interval so consecutive chords don't smear */
const CHORD_S = CHORD_INTERVAL_S - 0.05
/* Lets Tone.js settle the schedule so the first chord's audio and draw line up */
const LEAD_IN_S = 0.05

/* Major triad as semitones above DO */
const TRIAD_OFFSETS = [0, 4, 7] as const
/*
 * I – IV – V – I in close voicing around DO: C-E-G, C-F-A, B-D-G, C-E-G in C.
 * Each chord moves as little as possible from the last, so the cadence stays
 * within a ninth of DO and sounds like one key rather than four jumps.
 */
const CADENCE_OFFSETS = [
  [0, 4, 7],
  [0, 5, 9],
  [-1, 2, 7],
  [0, 4, 7],
] as const

type PlaybackOptions = {
  toneEngine?: ToneEngine
}

export function useCircleOfFifthsPlayback(options: PlaybackOptions = {}) {
  const engine = options.toneEngine ?? defaultToneEngine
  const isPlayingSequence = ref(false)
  const currentChordIndex = ref(-1)

  /* Seconds from now until the last note's release tail has died away */
  function soundingSeconds(lengthS: number) {
    return LEAD_IN_S + lengthS + TONE_MODE_RELEASE_S[engine.toneMode.value]
  }

  function playChordAt(
    tonic: number,
    offsets: readonly number[],
    durationS: number,
    whenS: number,
  ) {
    for (const offset of offsets) {
      engine.playToneAt(midiToFrequency(tonic + offset), durationS, whenS)
    }
  }

  async function playReference(midi: number) {
    stopSequence()
    await engine.warmUp()
    engine.playToneAt(
      midiToFrequency(midi),
      REFERENCE_TONE_S,
      engine.getNow() + LEAD_IN_S,
    )

    return soundingSeconds(REFERENCE_TONE_S)
  }

  async function playTriad(tonic: number) {
    stopSequence()
    await engine.warmUp()
    playChordAt(tonic, TRIAD_OFFSETS, TRIAD_S, engine.getNow() + LEAD_IN_S)

    return soundingSeconds(TRIAD_S)
  }

  async function playCadence(tonic: number) {
    stopSequence()
    await engine.warmUp()
    isPlayingSequence.value = true

    const startAt = engine.getNow() + LEAD_IN_S
    CADENCE_OFFSETS.forEach((offsets, index) => {
      const when = startAt + index * CHORD_INTERVAL_S
      playChordAt(tonic, offsets, CHORD_S, when)
      engine.scheduleDraw(() => {
        if (!isPlayingSequence.value) return

        currentChordIndex.value = index
      }, when)
    })

    const lengthS = CADENCE_OFFSETS.length * CHORD_INTERVAL_S
    engine.scheduleDraw(() => {
      isPlayingSequence.value = false
      currentChordIndex.value = -1
    }, startAt + lengthS)

    return soundingSeconds(lengthS)
  }

  function stopSequence() {
    engine.cancelScheduled(0)
    isPlayingSequence.value = false
    currentChordIndex.value = -1
  }

  if (getCurrentInstance()) {
    onUnmounted(() => stopSequence())
  }

  return {
    isPlayingSequence: readonly(isPlayingSequence),
    currentChordIndex: readonly(currentChordIndex),
    playReference,
    playTriad,
    playCadence,
    stopSequence,
  }
}
