import { useRafFn } from '@vueuse/core'
import type { MaybeRefOrGetter } from 'vue'
import { CLOSE_CENTS } from '@/utils/pitchColors'
import { createTuningHold } from '@/utils/tuningHold'

/* Shorter than Sing the Keys' 1.5 s tune: a record attempt is repeated many
 * times while the singer creeps lower or higher, and the extremes of a voice
 * are tiring to sustain. Still long enough to rule out a passing slide. */
export const RANGE_FINDER_HOLD_MS = 1000

export type RangeFinderStep = 'idle' | 'low' | 'high' | 'result'

type RangeFinderOptions = {
  /* Fractional MIDI of the live sung pitch, or null for silence */
  sungMidi: MaybeRefOrGetter<number | null>
}

/* Cents off the nearest semitone — the same rounding the hold uses to pick the
 * semitone, so "which note" and "how in tune" can never disagree. */
export const centsOffNearest = (midi: number) => (midi - Math.round(midi)) * 100

/* Whether a high-step note is clean enough to count */
export const isCleanEnough = (midi: number) =>
  Math.abs(centsOffNearest(midi)) <= CLOSE_CENTS

/**
 * Finds the singer's lowest steady note and highest clean note. Each step keeps
 * listening after a hold completes, so the singer can creep further and every
 * new hold past the record replaces it; they press Done when they have reached
 * their limit. Only notes past the record fill the hold.
 *
 * The low step only asks for a steady hold. The high step also asks for the
 * note to sit within CLOSE_CENTS: a strained top note wobbles out of tune, and
 * "clean" is the point of the high end of a practice range.
 *
 * Samples once per animation frame rather than watching the pitch, for the
 * reason useSongTuning gives: a steady tone never changes the ref.
 */
export function useRangeFinder({ sungMidi }: RangeFinderOptions) {
  const hold = createTuningHold({ holdMs: RANGE_FINDER_HOLD_MS })

  const step = ref<RangeFinderStep>('idle')
  const lowestMidi = ref<number | null>(null)
  const highestMidi = ref<number | null>(null)
  const candidateMidi = ref<number | null>(null)
  const progress = ref(0)

  /* Past the current record — the only notes worth holding for */
  function beatsRecord(midi: number): boolean {
    const note = Math.round(midi)

    return step.value === 'low'
      ? lowestMidi.value === null || note < lowestMidi.value
      : highestMidi.value === null || note > highestMidi.value
  }

  /*
   * Frames that can't change the result count as silence, which pauses the
   * hold rather than resetting it. So the bar only ever fills toward a new
   * record: re-singing the record, going the wrong way, or (on the high step)
   * singing out of tune leaves it still.
   */
  function readFrame(): number | null {
    const midi = toValue(sungMidi)
    if (midi === null || !beatsRecord(midi)) return null
    if (step.value === 'high' && !isCleanEnough(midi)) return null

    return midi
  }

  function recordHeld(heldMidi: number) {
    if (step.value === 'low') {
      lowestMidi.value = Math.min(lowestMidi.value ?? heldMidi, heldMidi)
    } else {
      highestMidi.value = Math.max(highestMidi.value ?? heldMidi, heldMidi)
    }
    hold.reset()
  }

  const { pause, resume } = useRafFn(
    ({ timestamp }) => {
      hold.push(readFrame(), timestamp)
      candidateMidi.value = hold.candidateMidi
      progress.value = hold.progress

      if (hold.heldMidi !== null) recordHeld(hold.heldMidi)
    },
    { immediate: false },
  )

  function listen(nextStep: 'low' | 'high') {
    hold.reset()
    candidateMidi.value = null
    progress.value = 0
    step.value = nextStep
    resume()
  }

  function stopListening() {
    pause()
    candidateMidi.value = null
    progress.value = 0
  }

  function start() {
    lowestMidi.value = null
    highestMidi.value = null
    listen('low')
  }

  /* Done on the current step: low moves on to high, high shows the result. */
  function next() {
    if (step.value === 'low') {
      listen('high')

      return
    }

    stopListening()
    step.value = 'result'
  }

  function cancel() {
    stopListening()
    step.value = 'idle'
  }

  return {
    step: readonly(step),
    lowestMidi: readonly(lowestMidi),
    highestMidi: readonly(highestMidi),
    candidateMidi: readonly(candidateMidi),
    progress: readonly(progress),
    start,
    next,
    cancel,
  }
}
