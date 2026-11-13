import { useRafFn } from '@vueuse/core'
import type { MaybeRefOrGetter } from 'vue'
import {
  VOICE_RANGE_HIGHEST_MIDI,
  VOICE_RANGE_LOWEST_MIDI,
} from '@/utils/normalizeVoiceRange'
import { CLOSE_CENTS } from '@/utils/pitchColors'
import { createTuningHold, TUNING_STRAY_MS } from '@/utils/tuningHold'

/* Shorter than Sing the Keys' 1.5 s tune: a record attempt is repeated many
 * times while the singer creeps lower or higher, and the extremes of a voice
 * are tiring to sustain. Still long enough to rule out a passing slide. */
export const RANGE_FINDER_HOLD_MS = 1000

/* How far from the held note a voice can wobble and come back. Vibrato stays
 * within this; a reading further off is another note or a detector slip. */
const HOLD_WOBBLE_SEMITONES = 1

export type RangeFinderStep = 'idle' | 'low' | 'high' | 'result'

/* Which ends a search covers: both (low then high) or just one */
export type RangeFinderMode = 'both' | 'low' | 'high'

/* Why a sung note isn't filling the hold, when the singer can do something
 * about it */
export type RangeFinderPauseReason =
  | 'notPastRecord'
  | 'offPitch'
  | 'aboveLimit'
  | 'unclear'

/* Mic level (RMS, 0–1) from which sound with no clean pitch counts as the
 * singer trying, not the room. The finder's mic runs without auto gain, so the
 * level follows how loud the singer really is. */
export const UNCLEAR_SOUND_LEVEL = 0.01

/* How long sound must stay unclear before the hint says so. Longer than the
 * other reasons' TUNING_STRAY_MS: every note starts and fades through a moment
 * of unclear sound, and a breath between tries is one too. */
export const UNCLEAR_CUE_MS = 500

type RangeFinderOptions = {
  /* Fractional MIDI of the live sung pitch, or null when no clean pitch is
   * heard */
  sungMidi: MaybeRefOrGetter<number | null>
  /* Mic level (RMS, 0–1). Tells a croaky or breathy note, which has no clean
   * pitch, from silence. Omit to treat every pitchless frame as silence. */
  soundLevel?: MaybeRefOrGetter<number>
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
 * Any distance past the record counts: the singer is in control, and a leap
 * from a comfortable note straight down to the bottom is normal. The clarity
 * gate and the unbroken hold keep detector slips out, such as a C3 that reads
 * as C2 now and then (see breaksHold).
 *
 * The low step only asks for a steady hold. The high step also asks for the
 * note to sit within CLOSE_CENTS: a strained top note wobbles out of tune, and
 * "clean" is the point of the high end of a practice range.
 *
 * Samples once per animation frame rather than watching the pitch, for the
 * reason useSongTuning gives: a steady tone never changes the ref.
 */
export function useRangeFinder({
  sungMidi,
  soundLevel = 0,
}: RangeFinderOptions) {
  const hold = createTuningHold({ holdMs: RANGE_FINDER_HOLD_MS })

  const step = ref<RangeFinderStep>('idle')
  const mode = ref<RangeFinderMode>('both')
  const lowestMidi = ref<number | null>(null)
  const highestMidi = ref<number | null>(null)
  const candidateMidi = ref<number | null>(null)
  const progress = ref(0)
  /* Whether the bar is moving right now, as opposed to paused on a candidate */
  const isFilling = ref(false)
  const pauseReason = ref<RangeFinderPauseReason | null>(null)
  /* The reason on the latest frame and when it began, before it has lasted
   * long enough to show */
  let latestPauseReason: RangeFinderPauseReason | null = null
  let latestPauseReasonSince = 0

  /* The span My range can hold. A note outside it would only be clamped on
   * save; at the bottom it is usually rumble or an octave slip near the
   * detector's frequency floor. */
  function isInSpan(midi: number): boolean {
    const note = Math.round(midi)

    return note >= VOICE_RANGE_LOWEST_MIDI && note <= VOICE_RANGE_HIGHEST_MIDI
  }

  function currentRecord(): number | null {
    return step.value === 'low' ? lowestMidi.value : highestMidi.value
  }

  /* Past the current record and in span — the only notes worth holding for */
  function beatsRecord(midi: number): boolean {
    if (!isInSpan(midi)) return false

    const note = Math.round(midi)
    const record = currentRecord()
    if (record === null) return true

    return step.value === 'low' ? note < record : note > record
  }

  /*
   * Frames that can't change the result count as silence, which pauses the
   * hold. So the bar only ever fills toward a new record: re-singing the
   * record, going the wrong way, or (on the high step) singing out of tune
   * leaves it still. breaksHold decides when a pause becomes a reset.
   */
  function readFrame(): number | null {
    const midi = toValue(sungMidi)
    if (midi === null || !beatsRecord(midi)) return null
    if (step.value === 'high' && !isCleanEnough(midi)) return null

    return midi
  }

  /* Mirrors readFrame. The record comes first: a cleaner note still wouldn't
   * count if it isn't past the record. A record at the end of the span has no
   * next note to point at. */
  function readPauseReason(): RangeFinderPauseReason | null {
    const midi = toValue(sungMidi)
    /* Sound but no pitch: without a reason the bar would sit still, and a
     * croaky note at the bottom of the voice would look like a dead mic. */
    if (midi === null)
      return toValue(soundLevel) >= UNCLEAR_SOUND_LEVEL ? 'unclear' : null

    /* Only reaching up: above the span the note can't count, and without a
     * reason the bar would sit still as if the app had stopped listening. */
    if (step.value === 'high' && Math.round(midi) > VOICE_RANGE_HIGHEST_MIDI)
      return 'aboveLimit'

    if (!isInSpan(midi)) return null

    if (!beatsRecord(midi)) {
      const spanEnd =
        step.value === 'low'
          ? VOICE_RANGE_LOWEST_MIDI
          : VOICE_RANGE_HIGHEST_MIDI

      return currentRecord() === spanEnd ? null : 'notPastRecord'
    }

    return step.value === 'high' && !isCleanEnough(midi) ? 'offPitch' : null
  }

  /* A reason shows once it has lasted TUNING_STRAY_MS, so sliding through the
   * record or a wobble across the clean limit doesn't flash a cue (unclear
   * sound waits longer, see UNCLEAR_CUE_MS). It clears at once, because the
   * bar is already moving again. */
  function updatePauseReason(timestamp: number) {
    const reason = readPauseReason()
    if (reason !== latestPauseReason) {
      latestPauseReason = reason
      latestPauseReasonSince = timestamp
    }

    const delayMs = reason === 'unclear' ? UNCLEAR_CUE_MS : TUNING_STRAY_MS

    pauseReason.value =
      timestamp - latestPauseReasonSince >= delayMs ? reason : null
  }

  function clearPauseReason() {
    latestPauseReason = null
    pauseReason.value = null
  }

  /*
   * Singing a note that isn't past the record ends the hold, so a record takes
   * one unbroken stretch. Otherwise a singer on C3 with a G♯2 record builds a
   * C2 record out of the moments the detector reads an octave low, however far
   * apart they are. A far note ends it at once, as the jump gate leaves it on
   * screen only briefly between slips; a near one must last, as vibrato crosses
   * into it. Silence, unclear sound and an out-of-tune high note only pause:
   * breathy dropouts and strained top notes are part of a real attempt.
   */
  function breaksHold(): boolean {
    if (pauseReason.value === 'notPastRecord') return true

    const midi = toValue(sungMidi)
    const candidate = hold.candidateMidi
    if (midi === null || candidate === null) return false
    if (!isInSpan(midi) || beatsRecord(midi)) return false

    return Math.abs(Math.round(midi) - candidate) > HOLD_WOBBLE_SEMITONES
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
      const frame = readFrame()
      updatePauseReason(timestamp)
      if (breaksHold()) hold.reset()

      hold.push(frame, timestamp)
      candidateMidi.value = hold.candidateMidi
      progress.value = hold.progress
      isFilling.value =
        frame !== null && Math.round(frame) === hold.candidateMidi

      if (hold.heldMidi !== null) recordHeld(hold.heldMidi)
    },
    { immediate: false },
  )

  function listen(nextStep: 'low' | 'high') {
    hold.reset()
    candidateMidi.value = null
    progress.value = 0
    isFilling.value = false
    clearPauseReason()
    step.value = nextStep
    resume()
  }

  function stopListening() {
    pause()
    candidateMidi.value = null
    progress.value = 0
    isFilling.value = false
    clearPauseReason()
  }

  /* Omit `only` for the full low → high search; pass an end to sing just that
   * one. Records start empty either way, so a singer who can no longer reach
   * the saved note can still move it inward. */
  function start(only?: 'low' | 'high') {
    mode.value = only ?? 'both'
    lowestMidi.value = null
    highestMidi.value = null
    listen(only ?? 'low')
  }

  /* Done on the current step: in a full search low moves on to high; otherwise
   * the search ends and shows the result. */
  function next() {
    if (step.value === 'low' && mode.value === 'both') {
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
    mode: readonly(mode),
    lowestMidi: readonly(lowestMidi),
    highestMidi: readonly(highestMidi),
    candidateMidi: readonly(candidateMidi),
    progress: readonly(progress),
    isFilling: readonly(isFilling),
    pauseReason: readonly(pauseReason),
    start,
    next,
    cancel,
  }
}
