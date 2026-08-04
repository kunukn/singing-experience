/*
 * Frame-to-frame tracking of detected tones.
 *
 * The sieve answers "what is sounding right now" one frame at a time, with no
 * memory. That is not enough to name a note, because a sung tone moves: vibrato
 * swings the fundamental either side of centre, and once the swing passes ±50
 * cents the instantaneous pitch is genuinely inside the neighbouring semitone.
 * Naming each frame independently then flickers a single sustained note between
 * three cards — measured at ±60 cents vibrato: C4 73%, C♯4 15%, B3 13%, and at
 * ±100 cents it degrades to a near-even three-way split.
 *
 * So tones are matched across frames by pitch proximity and their frequency is
 * smoothed, which averages the vibrato back to the centre pitch it is centred
 * on. Naming happens from the smoothed value, with hysteresis on top.
 *
 * Tracking by identity rather than by note number also fixes a subtler problem:
 * keyed by MIDI note, a tone that drifts a semitone looks like a different tone
 * and loses its onset timing, so it has to re-earn the onset window mid-note.
 */

/*
 * EMA weight for a track's frequency. Vibrato runs near 5.5 Hz — a ~180 ms
 * period — so the average has to span at least that to cancel it. 0.12 gives a
 * time constant of roughly 8 frames (~130 ms at 60 fps), which flattens vibrato
 * while still settling on a deliberate note change fast enough to feel live.
 */
const FREQUENCY_SMOOTHING_FACTOR = 0.12

/*
 * Cents a tone may move between frames and still count as the same tone.
 *
 * Wide enough that a deep vibrato excursion is not mistaken for a new tone
 * (the instantaneous pitch can sit ~100 cents from the smoothed centre), but
 * under the ~200 cents that would let one voice of a close chord capture its
 * neighbour's track.
 */
const TRACK_MATCH_TOLERANCE_CENTS = 120

export type ToneTrack = {
  /* Vibrato-averaged frequency — what the note name is derived from. */
  smoothedFrequency: number
  /* Most recent reading, so callers can show live pitch if they want it. */
  observedFrequency: number
  firstSeenAt: number
  lastSeenAt: number
  /*
   * Note this track was last named. Carried forward across frames so the caller
   * can feed it to frequencyToNote for hysteresis; tracking itself never reads
   * it. The caller writes it back after naming, and a fresh track starts
   * undefined so its first frame names without bias.
   */
  previousMidi: number | undefined
}

const centsBetween = (a: number, b: number) => Math.abs(1200 * Math.log2(a / b))

/*
 * Advance the track list by one frame.
 *
 * Each observed fundamental claims the nearest unclaimed track within the match
 * tolerance, or starts a new one. Tracks nobody claimed are returned untouched —
 * expiring them is the caller's job, since the release window belongs with the
 * display rather than with tracking.
 *
 * A new track starts with its smoothed frequency equal to the observation, so a
 * note appears at its true pitch immediately and smoothing only governs how it
 * drifts afterwards.
 */
export function updateToneTracks(
  tracks: readonly ToneTrack[],
  observedFrequencies: readonly number[],
  now: number,
): ToneTrack[] {
  const unclaimed = new Set(tracks)
  const updated: ToneTrack[] = []

  /* Lowest first, so a deterministic pass order — otherwise two observations
   * equidistant from one track could resolve differently frame to frame. */
  const observations = [...observedFrequencies].sort((a, b) => a - b)

  for (const frequency of observations) {
    let nearest: ToneTrack | null = null
    let nearestCents = Infinity

    for (const track of unclaimed) {
      const distance = centsBetween(frequency, track.smoothedFrequency)
      if (distance <= TRACK_MATCH_TOLERANCE_CENTS && distance < nearestCents) {
        nearest = track
        nearestCents = distance
      }
    }

    if (nearest) {
      unclaimed.delete(nearest)
      updated.push({
        smoothedFrequency:
          FREQUENCY_SMOOTHING_FACTOR * frequency +
          (1 - FREQUENCY_SMOOTHING_FACTOR) * nearest.smoothedFrequency,
        observedFrequency: frequency,
        firstSeenAt: nearest.firstSeenAt,
        lastSeenAt: now,
        previousMidi: nearest.previousMidi,
      })
    } else {
      updated.push({
        smoothedFrequency: frequency,
        observedFrequency: frequency,
        firstSeenAt: now,
        lastSeenAt: now,
        previousMidi: undefined,
      })
    }
  }

  /* Tracks that went unheard this frame survive with their old timestamps; the
   * caller decides when they have been silent long enough to drop. */
  for (const track of unclaimed) updated.push(track)

  return updated.sort((a, b) => a.smoothedFrequency - b.smoothedFrequency)
}
