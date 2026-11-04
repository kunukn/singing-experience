/* Below this level a mic is hearing the room, not a voice. Same floor the take
 * analysis uses for "sound" in analyzeTake.ts. */
const SOUND_FLOOR_RMS = 10 ** (-50 / 20)

/* Long enough to find the mic and take a breath before singing. */
const NO_SOUND_HINT_MS = 3000

/*
 * Lifts quiet singing into view without letting a belt flatten against the
 * edges. An unprocessed mic often peaks below 0.1, which would barely move the
 * line; tanh boosts small values and eases large ones towards ±1.
 */
const DISPLAY_DRIVE = 6

export function shapeSampleForDisplay(sample: number): number {
  return Math.tanh(sample * DISPLAY_DRIVE)
}

/*
 * Where to start drawing: the first rising zero crossing. Starting each frame
 * at the same point in the cycle holds a sung note still, as a sine curve,
 * instead of jittering sideways. 0 when there's no crossing, as in silence.
 */
export function findRisingZeroCrossing(
  samples: ArrayLike<number>,
  searchLength: number,
): number {
  const end = Math.min(searchLength, samples.length - 1)

  for (let i = 0; i < end; i++) {
    if (samples[i] <= 0 && samples[i + 1] > 0) return i + 1
  }

  return 0
}

/*
 * Tells a broken or muted mic from a singer who hasn't started. It only looks
 * until sound first arrives, so a long pause mid-song never raises the hint.
 */
export function createNoSoundWatch(startedAtMs: number) {
  let hasHeardSound = false

  function update(rms: number, nowMs: number): boolean {
    if (rms >= SOUND_FLOOR_RMS) hasHeardSound = true

    return !hasHeardSound && nowMs - startedAtMs >= NO_SOUND_HINT_MS
  }

  return { update }
}

export function isSoundLevel(rms: number): boolean {
  return rms >= SOUND_FLOOR_RMS
}
