import { midiToFrequency } from '@/utils/noteUtils'

/*
 * Two-singer ("duet") preview: split the mic signal at a crossover frequency
 * and run one monophonic pitch detector per band, so a low voice and a high
 * voice can be tracked at the same time.
 *
 * Every tunable in that scheme lives here, as a plain function over numbers,
 * so the behaviour is unit-testable without a Web Audio graph. The graph
 * itself is in @/composables/useDuetPitchDetection.
 *
 * The hard problem this file exists to solve: a voice singing C3 has strong
 * energy at C4, G4, C5… — its own harmonics. A highpass at C4 therefore passes
 * the SOLO singer's 2nd harmonic at nearly full strength, and the high-band
 * detector happily reports a confident C4 that nobody sang. Rejecting every
 * harmonically-related pitch would also reject the real male+female octave
 * duet, which is the whole point of the feature. So the gate is energy-aware:
 * a harmonic is only suppressed when the high band is also much quieter than
 * the low one. A second singer contributes real energy; a harmonic does not.
 */

/* Biquads cascaded per band. One is -12 dB/oct — too gentle to separate voices
 * an octave apart. Three in series give -36 dB/oct, so a fundamental one octave
 * below the crossover lands ~36 dB down in the high band instead of ~12. */
export const BAND_FILTER_STAGES = 3

/* Cents — how close to an exact integer ratio counts as "harmonic of the low
 * voice" rather than "second singer". A singer holds pitch to roughly ±20¢, so
 * ±35¢ catches genuine harmonics without swallowing a deliberately sung note. */
export const HARMONIC_MATCH_TOLERANCE_CENTS = 35

/* dB — a harmonically-related high-band pitch must be at least this loud
 * relative to the low band to count as a real second singer. After the
 * crossover filters, a voice's own 2nd harmonic sits well under -12 dB of its
 * fundamental; an actual second singer lands within a few dB. */
export const HARMONIC_ENERGY_FLOOR_DB = -12

/* RMS — below this the band is room tone, not a voice. */
export const BAND_SILENCE_RMS = 0.005

/* Harmonics tested against the low lane. Above the 4th the ratios crowd close
 * enough together that the tolerance window starts catching real notes. */
const TESTED_HARMONICS = [2, 3, 4]

/*
 * Semitones of slack at the crossover before a pitch is judged to be in the
 * wrong band. Needed because the filters are not brick walls — a voice sitting
 * right on the crossover leaks into both bands and can be detected a few cents
 * either side of it.
 */
const BAND_EDGE_MARGIN_SEMITONES = 1

/*
 * Where to split the two bands: the midpoint of the selected voice range. For
 * the "Men & Women" range (C3–C5, midi 48–72) that lands exactly on C4, the
 * boundary between a comfortable male and a comfortable female octave.
 */
export function crossoverFrequency(midiMin: number, midiMax: number): number {
  return midiToFrequency((midiMin + midiMax) / 2)
}

/* Loudness of one time-domain frame. */
export function rootMeanSquare(buffer: Float32Array): number {
  if (buffer.length === 0) return 0

  let sumOfSquares = 0
  for (let i = 0; i < buffer.length; i++) {
    sumOfSquares += buffer[i] * buffer[i]
  }

  return Math.sqrt(sumOfSquares / buffer.length)
}

/* Amplitude ratio in dB. -Infinity when there is no reference signal at all. */
export function relativeEnergyDb(
  bandRms: number,
  referenceRms: number,
): number {
  if (referenceRms <= 0) return bandRms > 0 ? Infinity : -Infinity
  if (bandRms <= 0) return -Infinity

  // 20·log₁₀ — amplitude ratio, not power, since RMS is an amplitude
  return 20 * Math.log10(bandRms / referenceRms)
}

/* True when candidateHz sits on the 2nd, 3rd or 4th harmonic of fundamentalHz,
 * within the tolerance window. */
export function isHarmonicOf(
  candidateHz: number,
  fundamentalHz: number,
): boolean {
  if (candidateHz <= 0 || fundamentalHz <= 0) return false

  return TESTED_HARMONICS.some((harmonic) => {
    // 1200·log₂ ratio = the interval between the two pitches, in cents
    const cents = Math.abs(
      1200 * Math.log2(candidateHz / (fundamentalHz * harmonic)),
    )

    return cents <= HARMONIC_MATCH_TOLERANCE_CENTS
  })
}

/*
 * Whether a detected pitch plausibly belongs to the band it was found in.
 *
 * This is the gate that makes band-splitting work at all, and it is not
 * optional. Filtering removes a voice's FUNDAMENTAL from the other band but
 * cannot remove its harmonics, which are spread across the whole spectrum — and
 * an autocorrelation detector reconstructs the fundamental from those harmonics
 * alone (the "missing fundamental" effect). So a man singing C3 makes the HIGH
 * band report C3, not silence. Measured, not theorised: without this check a
 * solo singer draws two lines on the same note.
 *
 * The mirror case is a solo high voice leaving a faint but still-periodic
 * residue in the low band, which reports the high voice's own pitch.
 *
 * A pitch below the crossover cannot be a high-band voice, and one above it
 * cannot be a low-band voice. That single constraint kills both artefacts.
 */
export function isPitchInBand(
  pitchHz: number,
  crossoverHz: number,
  band: 'low' | 'high',
): boolean {
  if (pitchHz <= 0) return false

  const margin = Math.pow(2, BAND_EDGE_MARGIN_SEMITONES / 12)

  return band === 'low'
    ? pitchHz <= crossoverHz * margin
    : pitchHz >= crossoverHz / margin
}

export type HighLaneGateInput = {
  highHz: number | null
  lowHz: number | null
  highRms: number
  lowRms: number
}

/*
 * Whether the high band's detected pitch is a real second singer worth drawing.
 *
 * An unrelated pitch is always shown — two people singing a fifth apart is
 * unambiguous. A harmonically-related pitch is shown only when the high band
 * carries comparable energy, which is what separates "a woman is singing C4"
 * from "a man singing C3 has a bright 2nd harmonic".
 */
export function shouldShowHighLane(input: HighLaneGateInput): boolean {
  const { highHz, lowHz, highRms, lowRms } = input
  if (highHz === null) return false

  /* Nothing but room tone up there. */
  if (highRms < BAND_SILENCE_RMS) return false

  /* No low voice to be a harmonic of, so it stands on its own. */
  if (lowHz === null) return true

  if (!isHarmonicOf(highHz, lowHz)) return true

  return relativeEnergyDb(highRms, lowRms) >= HARMONIC_ENERGY_FLOOR_DB
}
