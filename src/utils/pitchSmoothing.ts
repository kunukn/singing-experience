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
