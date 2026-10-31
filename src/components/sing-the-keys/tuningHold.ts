/*
 * The hold behind "Tune": the singer picks the song's lowest note by singing
 * it, and a semitone held for holdMs becomes that note. Same idea as the focus
 * tab's tone tracker, but it reports progress for the bar and stops at the
 * first completed hold.
 *
 * Kept free of Vue and timers, so the timing rules can be tested with
 * hand-written timestamps.
 */

/* Longer than the focus tab's 400 ms: low notes come out breathy and wobbly,
 * and a finished hold re-pitches the whole song, so it has to be deliberate. */
export const TUNING_HOLD_MS = 1500

/* A neighbouring semitone must last this long before it takes over the hold.
 * Shorter blips — a vibrato swing across the semitone boundary (5–7 Hz, so a
 * half cycle is under 100 ms) or a crackle on a low note — only pause it. */
export const TUNING_STRAY_MS = 150

/* A frame gap longer than this is a pause, not singing, and adds no time —
 * the same limit as the pitch chart's PAUSE_GAP_MS. */
const MAX_FRAME_GAP_MS = 250

export type TuningHold = {
  /* The semitone being held, or null before the first voiced frame */
  readonly candidateMidi: number | null
  /* 0–1 share of holdMs held on candidateMidi */
  readonly progress: number
  /* The finished note; once set, further frames are ignored */
  readonly heldMidi: number | null
  /* Fractional MIDI from the detected frequency, or null for silence */
  push: (midi: number | null, timestampMs: number) => void
  reset: () => void
}

export function createTuningHold({
  holdMs = TUNING_HOLD_MS,
  strayMs = TUNING_STRAY_MS,
}: { holdMs?: number; strayMs?: number } = {}): TuningHold {
  let candidateMidi: number | null = null
  let candidateHeldMs = 0
  let strayMidi: number | null = null
  let strayHeldMs = 0
  let heldMidi: number | null = null
  let lastTimestamp: number | null = null

  function resetStray() {
    strayMidi = null
    strayHeldMs = 0
  }

  function track(roundedMidi: number, elapsedMs: number) {
    if (roundedMidi === candidateMidi) {
      resetStray()
      candidateHeldMs += elapsedMs

      return
    }

    if (roundedMidi === strayMidi) {
      strayHeldMs += elapsedMs
    } else {
      strayMidi = roundedMidi
      strayHeldMs = 0
    }
    /* The first voiced note has nothing to stray from */
    if (candidateMidi !== null && strayHeldMs < strayMs) return

    candidateMidi = roundedMidi
    candidateHeldMs = strayHeldMs
    resetStray()
  }

  return {
    get candidateMidi() {
      return candidateMidi
    },
    get progress() {
      return Math.min(1, candidateHeldMs / holdMs)
    },
    get heldMidi() {
      return heldMidi
    },
    push(midi, timestampMs) {
      if (heldMidi !== null) return

      /* Silence keeps the candidate, so a dropout on a breathy note does not
       * throw away the hold — it only stops the clock. */
      if (midi === null) {
        lastTimestamp = null

        return
      }

      const elapsedMs = lastTimestamp === null ? 0 : timestampMs - lastTimestamp
      lastTimestamp = timestampMs
      track(Math.round(midi), elapsedMs > MAX_FRAME_GAP_MS ? 0 : elapsedMs)

      if (candidateMidi !== null && candidateHeldMs >= holdMs) {
        heldMidi = candidateMidi
      }
    },
    reset() {
      candidateMidi = null
      candidateHeldMs = 0
      heldMidi = null
      lastTimestamp = null
      resetStray()
    },
  }
}
