import { centsBetween } from './pitchMatch'

/* EMA weight — 0.3 blends 30% new pitch + 70% previous, smoothing jitter
 * without lagging a held note. */
const SMOOTHING_FACTOR = 0.3

/* How far (in cents) a new pitch may sit from the smoothed one before the
 * smoothing lets go and adopts it outright. Jitter and vibrato stay inside a
 * semitone and are still averaged; a step to another note is not, since the
 * average closes only 30% of the gap per frame — a fifth took ~130 ms to come
 * within scoring tolerance. */
const SMOOTHING_RESET_CENTS = 100

/*
 * One frame of pitch smoothing, shared by every detector. `smoothedHz` is the
 * previous result, null after silence or an unclear frame. Returns the new
 * smoothed pitch.
 */
export function smoothPitch(
  smoothedHz: number | null,
  pitchHz: number,
): number {
  if (smoothedHz === null) return pitchHz

  const isNewNote =
    Math.abs(centsBetween(pitchHz, smoothedHz)) > SMOOTHING_RESET_CENTS
  if (isNewNote) return pitchHz

  return SMOOTHING_FACTOR * pitchHz + (1 - SMOOTHING_FACTOR) * smoothedHz
}

/*
 * How long a jump of more than SMOOTHING_RESET_CENTS must hold before it is
 * believed. Background noise (a washing machine, a fan) can win the
 * autocorrelation for a frame or two — 17–33 ms at 60 fps — but a voice can't
 * leave a note and come back that fast. The cost: a real note change shows
 * about this much later.
 */
export const JUMP_CONFIRM_MS = 80

export type JumpGate = {
  /* The pitch to use, or null to hold the last one while a jump is unconfirmed */
  push: (pitchHz: number, timestampMs: number) => number | null
  /* Forget the last pitch — call on silence or an unclear frame */
  reset: () => void
}

/*
 * Rejects one- or two-frame pitch spikes: a frame far from the last accepted
 * pitch only gets through once it has stayed put for confirmMs. Noise that
 * keeps jumping around never stays put, so never confirms. Pure, like
 * smoothPitch, so the timing can be tested with hand-written timestamps.
 */
export function createJumpGate({
  confirmMs = JUMP_CONFIRM_MS,
}: { confirmMs?: number } = {}): JumpGate {
  let acceptedHz: number | null = null
  let candidateHz: number | null = null
  let candidateSince = 0

  function isNear(pitchHz: number, referenceHz: number) {
    return Math.abs(centsBetween(pitchHz, referenceHz)) <= SMOOTHING_RESET_CENTS
  }

  function accept(pitchHz: number) {
    acceptedHz = pitchHz
    candidateHz = null

    return pitchHz
  }

  return {
    push(pitchHz, timestampMs) {
      if (acceptedHz === null || isNear(pitchHz, acceptedHz)) {
        return accept(pitchHz)
      }

      if (candidateHz === null || !isNear(pitchHz, candidateHz)) {
        candidateHz = pitchHz
        candidateSince = timestampMs
      } else {
        /* Follow the candidate, so a jump that lands and then settles is
         * still one candidate rather than a fresh start each frame */
        candidateHz = pitchHz
      }

      if (timestampMs - candidateSince < confirmMs) return null

      return accept(pitchHz)
    },
    reset() {
      acceptedHz = null
      candidateHz = null
    },
  }
}
