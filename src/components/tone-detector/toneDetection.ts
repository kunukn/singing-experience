/*
 * Multi-tone detection DSP: turn an FFT magnitude spectrum into a set of
 * fundamentals. Pure functions over plain arrays, kept separate from the Web
 * Audio plumbing in useMultiToneDetection.ts so the behaviour is unit-testable
 * without a browser.
 *
 * Two limits are inherent to this approach and are NOT bugs to be chased:
 *
 * 1. Frequency resolution. At fftSize 4096 and 48 kHz a bin spans ~11.7 Hz, and
 *    two partials need roughly two bins between them to appear as separate
 *    peaks. A semitone is 5.95% of the frequency, so semitones only resolve
 *    above ~390 Hz (G4) and whole tones above ~190 Hz (G3). Closer intervals
 *    down in the bass merge into a single peak before any of this code runs.
 *
 * 2. Notes at an exact integer ratio. A fundamental's harmonic series already
 *    contains every partial of any note at an integer multiple of it, so the
 *    upper note adds no peak the lower one does not already explain. Measured:
 *    C4 + C5 (2:1) reports C4 alone, and C3 + G4 (3:1, a twelfth) reports C3
 *    alone. Octaves are the common case; twelfths and double octaves behave the
 *    same way. Guessing at it from the even/odd partial balance is possible but
 *    fragile, and would cost accuracy on ordinary single notes.
 *
 *    Note this is the mirror of the piano's duet detection (duetBandSplit.ts),
 *    which splits by frequency band and so CAN separate a twelfth while being
 *    weaker elsewhere. Neither approach beats the physics on exact octaves.
 */

/*
 * Wider-window prominence — a peak must be this many dB above the average
 * of bins ±PROMINENCE_WINDOW away, not just immediate neighbours.
 */
const MIN_PEAK_PROMINENCE_DB = 3
const PROMINENCE_WINDOW = 4

/* Practical range for detected tones: ~C2 (65 Hz) to ~C7 (2100 Hz). */
export const MIN_FREQUENCY = 65
export const MAX_FREQUENCY = 2100

/* Maximum number of simultaneous tones to report. */
export const MAX_TONES = 8

/*
 * Harmonics scanned per candidate fundamental. 16 covers the audible series of
 * any tone in range. The previous implementation stopped at 4, which is why
 * overtones from the 5th up survived as separate reported notes.
 */
const MAX_HARMONIC = 16

/*
 * Cents — how far a peak may sit from an ideal n×f0 and still count as that
 * harmonic. Deliberately wider than a singer's pitch accuracy: real strings are
 * slightly inharmonic (a piano's n-th partial sits progressively above n×f0),
 * and the FFT quantises the low end coarsely. Widened to one bin at the bottom
 * of the range, where 50 cents is under 2 Hz but a bin is ~11.7 Hz.
 */
const HARMONIC_MATCH_TOLERANCE_CENTS = 50

/*
 * Candidate fundamentals scored per round. Every remaining peak is in principle
 * a candidate, but the quiet tail never wins and scoring runs every frame.
 */
const MAX_CANDIDATES = 24

/*
 * Partials (the fundamental counts as one) a candidate needs before it is
 * treated as harmonically supported rather than a lone peak.
 */
const MIN_SUPPORTED_PARTIALS = 2

/*
 * dB below the loudest peak in the frame that a LONE candidate may sit and
 * still be reported.
 *
 * A fundamental backed by its own harmonics is believable even when quiet: a
 * whole series lining up on integer multiples is evidence that noise cannot
 * fake. A single unsupported peak has no such evidence — a reverb tail, a room
 * resonance or a consonant transient looks exactly the same. So a lone peak has
 * to be loud to count, while a supported one does not.
 *
 * This is what keeps spurious notes off screen without asking the user to turn
 * the sensitivity down; pure sine tones (a flute, the app's own tone modes) are
 * lone by nature and still register because they are the loudest thing present.
 */
const LONE_PEAK_MIN_RELATIVE_DB = -12

/*
 * dB a LONE candidate must stand above the spectrum's noise floor.
 *
 * LONE_PEAK_MIN_RELATIVE_DB alone is vacuous when there is no real tone in the
 * frame: on room tone the loudest peak IS noise, so every other noise spike
 * looks acceptably close to it and a random note appears on screen. Measured
 * against the noise floor instead, the difference is stark — a smoothed noise
 * spike sits a few dB above the floor, a real tone 20 dB or more.
 */
const LONE_PEAK_MIN_ABOVE_FLOOR_DB = 15

export type SpectralPeak = { frequency: number; magnitude: number }

/* Maps a 0–10 user slider to the adaptive range in dB (lower = stricter).
 * ×4 gives 0–40 dB range — at 0 only the loudest peak passes, at 10 even quiet tones show. */
export function sensitivityToAdaptiveRange(sensitivity: number): number {
  return sensitivity * 4
}

/* Maps a 0–10 user slider to absolute floor in dB (higher slider = louder floor).
 * Base −80 dB is near silence; ×4 maps slider 0→−80 dB (hear everything), 10→−40 dB (gate noise). */
export function noiseGateToFloorDb(noiseGate: number): number {
  return -80 + noiseGate * 4
}

export function findPeaks(
  spectrum: Float32Array,
  sampleRate: number,
  fftSize: number,
  absoluteFloorDb: number,
  adaptiveRangeDb: number,
): SpectralPeak[] {
  const binWidth = sampleRate / fftSize
  // Start at bin 2 minimum — bin 0 is DC offset, bin 1 prone to low-frequency noise
  const minBin = Math.max(2, Math.ceil(MIN_FREQUENCY / binWidth))
  const maxBin = Math.min(
    Math.floor(MAX_FREQUENCY / binWidth),
    spectrum.length - 2,
  )

  /* Find the loudest bin in range to set an adaptive threshold */
  let maxMag = -Infinity
  for (let i = minBin; i <= maxBin; i++) {
    if (spectrum[i] > maxMag) maxMag = spectrum[i]
  }

  /* If the loudest bin is below the absolute floor, there is no signal */
  if (maxMag < absoluteFloorDb) return []

  const threshold = Math.max(absoluteFloorDb, maxMag - adaptiveRangeDb)

  const peaks: SpectralPeak[] = []

  for (let i = minBin; i <= maxBin; i++) {
    const mag = spectrum[i]
    if (mag < threshold) continue

    const left = spectrum[i - 1]
    const right = spectrum[i + 1]

    /* Local maximum: must be higher than both immediate neighbours */
    if (mag <= left || mag <= right) continue

    /*
     * Wider prominence check — compare against the average magnitude
     * of bins PROMINENCE_WINDOW steps away in each direction.
     */
    let surroundSum = 0
    let surroundCount = 0
    for (let w = 2; w <= PROMINENCE_WINDOW; w++) {
      if (i - w >= 0) {
        surroundSum += spectrum[i - w]
        surroundCount++
      }
      if (i + w < spectrum.length) {
        surroundSum += spectrum[i + w]
        surroundCount++
      }
    }
    const surroundAvg = surroundCount > 0 ? surroundSum / surroundCount : mag
    if (mag - surroundAvg < MIN_PEAK_PROMINENCE_DB) continue

    /* Quadratic (parabolic) interpolation for sub-bin frequency accuracy.
     * Fits a parabola through left/center/right magnitudes to find the true peak offset. */
    const denom = 2 * mag - left - right
    if (denom === 0) continue

    const delta = (0.5 * (right - left)) / denom // fractional bin offset from center
    const exactBin = i + delta
    const freq = exactBin * binWidth

    peaks.push({ frequency: freq, magnitude: mag })
  }

  /* Sort by magnitude descending — loudest first */
  peaks.sort((a, b) => b.magnitude - a.magnitude)

  return peaks
}

/*
 * The level most of the spectrum sits at — room tone, breath, preamp hiss.
 *
 * Median rather than mean: a handful of loud tonal peaks would drag a mean
 * upward, while the median describes the bulk of the bins, which is exactly the
 * floor a lone peak has to stand out from.
 */
export function estimateNoiseFloorDb(
  spectrum: Float32Array,
  sampleRate: number,
  fftSize: number,
): number {
  const binWidth = sampleRate / fftSize
  const minBin = Math.max(2, Math.ceil(MIN_FREQUENCY / binWidth))
  const maxBin = Math.min(
    Math.floor(MAX_FREQUENCY / binWidth),
    spectrum.length - 2,
  )
  if (maxBin <= minBin) return -Infinity

  const levels = Array.from(spectrum.slice(minBin, maxBin + 1)).sort(
    (a, b) => a - b,
  )

  return levels[Math.floor(levels.length / 2)]
}

/* dB is a log amplitude ratio; summing series support needs linear amplitude. */
function decibelsToAmplitude(decibels: number): number {
  return Math.pow(10, decibels / 20)
}

/* How far either side of an ideal harmonic a peak may sit, never tighter than
 * one FFT bin (below ~700 Hz the cents window is narrower than the grid). */
function harmonicToleranceHz(targetHz: number, binWidth: number): number {
  const centsWindow =
    targetHz * (Math.pow(2, HARMONIC_MATCH_TOLERANCE_CENTS / 1200) - 1)

  return Math.max(centsWindow, binWidth)
}

/* Closest peak to targetHz within tolerance, or null. `sorted` must be ordered
 * by frequency ascending — binary search keeps this off the hot path. */
function findClosestPeak(
  sorted: SpectralPeak[],
  targetHz: number,
  toleranceHz: number,
): SpectralPeak | null {
  let low = 0
  let high = sorted.length - 1
  let insertion = sorted.length

  while (low <= high) {
    const mid = (low + high) >> 1
    if (sorted[mid].frequency >= targetHz) {
      insertion = mid
      high = mid - 1
    } else {
      low = mid + 1
    }
  }

  let closest: SpectralPeak | null = null
  let closestDistance = Infinity

  /* The nearest peak is on one side or the other of the insertion point. */
  for (const index of [insertion - 1, insertion]) {
    const peak = sorted[index]
    if (!peak) continue

    const distance = Math.abs(peak.frequency - targetHz)
    if (distance <= toleranceHz && distance < closestDistance) {
      closest = peak
      closestDistance = distance
    }
  }

  return closest
}

/* Every remaining peak explained by a fundamental at f0 — its own bin plus each
 * harmonic present. n starts at 1 so the fundamental counts toward its own
 * support, which is what lets a pure sine tone win with no overtones at all. */
function collectSeries(
  sortedByFrequency: SpectralPeak[],
  fundamentalHz: number,
  binWidth: number,
): SpectralPeak[] {
  const members: SpectralPeak[] = []

  for (let n = 1; n <= MAX_HARMONIC; n++) {
    const target = fundamentalHz * n
    if (target > MAX_FREQUENCY) break

    const match = findClosestPeak(
      sortedByFrequency,
      target,
      harmonicToleranceHz(target, binWidth),
    )
    /* A partial can only be claimed once per series — a wide tolerance at high
     * n could otherwise match the same peak for two adjacent harmonics. */
    if (match && !members.includes(match)) members.push(match)
  }

  return members
}

/*
 * Reduce a peak list to the fundamentals that explain it.
 *
 * Greedy harmonic sieve: score every plausible fundamental by the total linear
 * amplitude of the peaks its harmonic series accounts for, keep the best one,
 * remove that whole series from the pool, and repeat on the residual.
 *
 * Scoring by summed series amplitude rather than by "who is loudest" is what
 * makes this correct in the two cases the previous greedy filter got wrong:
 *
 *  - A rich tone's own overtones can never outscore it. The 5th harmonic's
 *    series (5f, 10f, 15f) is a sparse subset of the fundamental's, so the
 *    fundamental always wins and takes its overtones with it.
 *  - A fundamental quieter than its own 2nd harmonic still wins, because the
 *    2nd harmonic only accounts for the even partials — roughly half the
 *    series — while the fundamental accounts for all of them.
 *
 * Candidates that are both unsupported and quiet are rejected outright — see
 * LONE_PEAK_MIN_RELATIVE_DB. That is what stops noise and reverb tails from
 * being reported as notes, and it is why this needs no user-facing knob.
 */
export function sieveFundamentals(
  peaks: SpectralPeak[],
  binWidth: number,
  maxTones: number,
  noiseFloorDb: number,
): SpectralPeak[] {
  const fundamentals: SpectralPeak[] = []
  let remaining = [...peaks].sort((a, b) => a.frequency - b.frequency)

  /* Reference for "quiet" — the strongest tone in the whole frame, fixed before
   * anything is removed so the bar does not drop as the sieve consumes peaks. */
  const loudestMagnitude = peaks.reduce(
    (loudest, peak) => Math.max(loudest, peak.magnitude),
    -Infinity,
  )

  while (fundamentals.length < maxTones && remaining.length > 0) {
    const candidates = [...remaining]
      .sort((a, b) => b.magnitude - a.magnitude)
      .slice(0, MAX_CANDIDATES)

    let best: {
      peak: SpectralPeak
      members: SpectralPeak[]
      support: number
    } | null = null

    for (const candidate of candidates) {
      const members = collectSeries(remaining, candidate.frequency, binWidth)

      /* A lone peak needs volume to be believed; a supported one does not. It
       * has to clear BOTH bars: well above the noise floor (so room tone cannot
       * promote itself when nothing else is playing) and not far below the
       * loudest tone (so it is not a reverb tail of a real note). */
      const isSupported = members.length >= MIN_SUPPORTED_PARTIALS
      if (!isSupported) {
        const aboveFloor = candidate.magnitude - noiseFloorDb
        const belowLoudest = candidate.magnitude - loudestMagnitude
        if (
          aboveFloor < LONE_PEAK_MIN_ABOVE_FLOOR_DB ||
          belowLoudest < LONE_PEAK_MIN_RELATIVE_DB
        )
          continue
      }

      const support = members.reduce(
        (total, member) => total + decibelsToAmplitude(member.magnitude),
        0,
      )

      if (!best || support > best.support) {
        best = { peak: candidate, members, support }
      }
    }

    /* Nothing left that clears the bar — the rest is noise. */
    if (!best) break

    fundamentals.push(best.peak)
    const claimed = new Set(best.members)
    remaining = remaining.filter((peak) => !claimed.has(peak))
  }

  /* Loudest first, matching what findPeaks returns — callers slice to a limit
   * and dedupe by note, and both want the strongest tones kept. */
  return fundamentals.sort((a, b) => b.magnitude - a.magnitude)
}
