import { PitchDetector } from 'pitchy'

import {
  MAX_FREQUENCY,
  MIN_FREQUENCY,
  ONSET_DEBOUNCE_MS,
} from '@/composables/usePitchDetection'
import { frequencyToNote, type NoteInfo } from '@/utils/noteUtils'
import { createJumpGate, smoothPitch } from '@/utils/pitchSmoothing'

/*
 * The note being sung during a recording, from samples LiveWaveform has already
 * read. Follows the same per-frame rules as usePitchDetection, which can't be
 * used here: it opens its own mic stream and stops when the tab is hidden.
 *
 * Kept free of Vue and timers, so the timing can be tested with hand-written
 * timestamps.
 */
export function createLivePitchReader(windowSamples: number) {
  const detector = PitchDetector.forFloat32Array(windowSamples)
  const jumpGate = createJumpGate()

  let smoothedHz: number | null = null
  let cleanSinceMs: number | null = null
  let heldNote: NoteInfo | null = null

  function reset() {
    jumpGate.reset()
    smoothedHz = null
    cleanSinceMs = null
    heldNote = null
  }

  /* Split from reading, so one detection per frame can feed other readers. */
  function detect(samples: Float32Array, sampleRate: number) {
    return detector.findPitch(samples, sampleRate)
  }

  function read(
    samples: Float32Array,
    sampleRate: number,
    clarityThreshold: number,
    nowMs: number,
  ): NoteInfo | null {
    const [pitchHz, clarity] = detect(samples, sampleRate)

    return readDetected(pitchHz, clarity, clarityThreshold, nowMs)
  }

  function readDetected(
    pitchHz: number,
    clarity: number,
    clarityThreshold: number,
    nowMs: number,
  ): NoteInfo | null {
    const isUsable =
      clarity >= clarityThreshold &&
      pitchHz >= MIN_FREQUENCY &&
      pitchHz <= MAX_FREQUENCY

    if (!isUsable) {
      reset()

      return null
    }

    const acceptedHz = jumpGate.push(pitchHz, nowMs)
    /* A jump that hasn't held yet may be noise, so keep showing the last note. */
    if (acceptedHz === null) return heldNote

    smoothedHz = smoothPitch(smoothedHz, acceptedHz)
    cleanSinceMs ??= nowMs
    if (nowMs - cleanSinceMs < ONSET_DEBOUNCE_MS) return null

    heldNote = frequencyToNote(smoothedHz, heldNote?.midiNote)

    return heldNote
  }

  return { detect, read, readDetected, reset }
}
