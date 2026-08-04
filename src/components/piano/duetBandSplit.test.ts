import { describe, expect, it } from 'vitest'
import { midiToFrequency } from '@/utils/noteUtils'
import {
  BAND_SILENCE_RMS,
  crossoverFrequency,
  isHarmonicOf,
  isPitchInBand,
  relativeEnergyDb,
  rootMeanSquare,
  shouldShowHighLane,
} from './duetBandSplit'

const C3 = midiToFrequency(48)
const C4 = midiToFrequency(60)
/* A whole tone above C3's 2nd harmonic — 200 cents clear of every overtone, so
 * it can only be a second singer. (G4 would NOT do: it is C3's 3rd harmonic.) */
const D4 = midiToFrequency(62)

/* A frame loud enough to clear BAND_SILENCE_RMS in the gate tests. */
const AUDIBLE_RMS = 0.08

describe('crossoverFrequency', () => {
  it('splits the "Men & Women" duet range at C4', () => {
    /* C3–C5 (48–72) — the midpoint is exactly C4, the boundary between a
     * comfortable male and a comfortable female octave. */
    expect(crossoverFrequency(48, 72)).toBeCloseTo(261.63, 1)
  })

  it('splits the choir range at its midpoint', () => {
    /* E2–C6 (40–84) — midpoint 62 = D4. */
    expect(crossoverFrequency(40, 84)).toBeCloseTo(293.66, 1)
  })

  it('handles an odd span by landing between semitones', () => {
    /* C4–C6 (60–84) — midpoint 72 = C5. */
    expect(crossoverFrequency(60, 84)).toBeCloseTo(523.25, 1)
    /* A3–A5 (57–81) — midpoint 69 = A4 = 440 Hz. */
    expect(crossoverFrequency(57, 81)).toBeCloseTo(440, 1)
  })
})

describe('rootMeanSquare', () => {
  it('is zero for silence', () => {
    expect(rootMeanSquare(new Float32Array(64))).toBe(0)
  })

  it('is the amplitude for a constant signal', () => {
    expect(rootMeanSquare(new Float32Array(64).fill(0.5))).toBeCloseTo(0.5, 6)
  })

  it('ignores sign', () => {
    expect(
      rootMeanSquare(new Float32Array([0.5, -0.5, 0.5, -0.5])),
    ).toBeCloseTo(0.5, 6)
  })

  it('is zero for an empty buffer', () => {
    expect(rootMeanSquare(new Float32Array(0))).toBe(0)
  })
})

describe('relativeEnergyDb', () => {
  it('is 0 dB for equal levels', () => {
    expect(relativeEnergyDb(0.08, 0.08)).toBeCloseTo(0, 6)
  })

  it('is -6 dB for half the amplitude', () => {
    expect(relativeEnergyDb(0.04, 0.08)).toBeCloseTo(-6.02, 1)
  })

  it('is -Infinity when the band is silent', () => {
    expect(relativeEnergyDb(0, 0.08)).toBe(-Infinity)
  })

  it('is -Infinity when both are silent', () => {
    expect(relativeEnergyDb(0, 0)).toBe(-Infinity)
  })
})

describe('isHarmonicOf', () => {
  it('matches the 2nd, 3rd and 4th harmonics', () => {
    expect(isHarmonicOf(C3 * 2, C3)).toBe(true)
    expect(isHarmonicOf(C3 * 3, C3)).toBe(true)
    expect(isHarmonicOf(C3 * 4, C3)).toBe(true)
  })

  it('tolerates a slightly flat or sharp singer', () => {
    // ±30 cents, inside the ±35 cent window
    expect(isHarmonicOf(C3 * 2 * Math.pow(2, 30 / 1200), C3)).toBe(true)
    expect(isHarmonicOf(C3 * 2 * Math.pow(2, -30 / 1200), C3)).toBe(true)
  })

  it('rejects a pitch just outside the tolerance window', () => {
    // ±40 cents, outside the ±35 cent window
    expect(isHarmonicOf(C3 * 2 * Math.pow(2, 40 / 1200), C3)).toBe(false)
  })

  it('rejects a non-harmonic interval', () => {
    /* A major seventh above the 2nd harmonic — a real second voice, not an
     * overtone of the first. */
    expect(isHarmonicOf(midiToFrequency(71), C3)).toBe(false)
  })

  it('rejects the unison — only overtones count', () => {
    expect(isHarmonicOf(C3, C3)).toBe(false)
  })

  it('rejects non-positive frequencies', () => {
    expect(isHarmonicOf(0, C3)).toBe(false)
    expect(isHarmonicOf(C4, 0)).toBe(false)
  })
})

describe('isPitchInBand', () => {
  /* The "Men & Women" range splits at C4. */
  const crossover = crossoverFrequency(48, 72)

  it('accepts a pitch on its own side of the crossover', () => {
    expect(isPitchInBand(C3, crossover, 'low')).toBe(true)
    expect(isPitchInBand(midiToFrequency(72), crossover, 'high')).toBe(true)
  })

  it('rejects the low voice reconstructed in the high band', () => {
    /* The measured failure this gate exists for: a man singing C3 makes the
     * highpassed band report C3, rebuilt from harmonics the filter cannot
     * remove. Without this, a solo singer draws two lines on the same note. */
    expect(isPitchInBand(C3, crossover, 'high')).toBe(false)
  })

  it('rejects the high voice leaking into the low band', () => {
    /* Mirror case: a solo C5 leaves a faint but periodic residue below the
     * crossover, which the low detector happily reports as C5. */
    expect(isPitchInBand(midiToFrequency(72), crossover, 'low')).toBe(false)
  })

  it('allows a semitone of slack at the crossover itself', () => {
    /* The filters are not brick walls, so a voice sitting on C4 is detectable
     * a little either side of it in both bands. */
    expect(isPitchInBand(midiToFrequency(61), crossover, 'low')).toBe(true)
    expect(isPitchInBand(midiToFrequency(59), crossover, 'high')).toBe(true)
    expect(isPitchInBand(midiToFrequency(62), crossover, 'low')).toBe(false)
    expect(isPitchInBand(midiToFrequency(58), crossover, 'high')).toBe(false)
  })

  it('rejects non-positive frequencies', () => {
    expect(isPitchInBand(0, crossover, 'low')).toBe(false)
    expect(isPitchInBand(-1, crossover, 'high')).toBe(false)
  })
})

describe('shouldShowHighLane', () => {
  it('hides the lane when the high band has no pitch', () => {
    expect(
      shouldShowHighLane({
        highHz: null,
        lowHz: C3,
        highRms: AUDIBLE_RMS,
        lowRms: AUDIBLE_RMS,
      }),
    ).toBe(false)
  })

  it('hides the lane when the high band is only room tone', () => {
    expect(
      shouldShowHighLane({
        highHz: C4,
        lowHz: null,
        highRms: BAND_SILENCE_RMS / 2,
        lowRms: 0,
      }),
    ).toBe(false)
  })

  it('shows a high pitch when nobody is singing low', () => {
    expect(
      shouldShowHighLane({
        highHz: C4,
        lowHz: null,
        highRms: AUDIBLE_RMS,
        lowRms: 0,
      }),
    ).toBe(true)
  })

  it('shows a non-harmonic interval regardless of level', () => {
    /* D4 sits 200 cents off C3's every overtone, so no amount of quietness
     * makes it explainable as a harmonic — it is a second singer. */
    expect(
      shouldShowHighLane({
        highHz: D4,
        lowHz: C3,
        highRms: 0.01,
        lowRms: AUDIBLE_RMS,
      }),
    ).toBe(true)
  })

  it('still treats a twelfth as a harmonic — G4 is C3’s 3rd overtone', () => {
    /* The interval a duet is most likely to be mistaken on after the octave. */
    expect(
      shouldShowHighLane({
        highHz: midiToFrequency(67),
        lowHz: C3,
        highRms: 0.01,
        lowRms: AUDIBLE_RMS,
      }),
    ).toBe(false)
  })

  it('shows an octave duet sung at comparable loudness', () => {
    /* A man on C3 and a woman on C4, -2.6 dB apart: the high band carries real
     * energy, so it is a second singer rather than an overtone. */
    expect(
      shouldShowHighLane({
        highHz: C4,
        lowHz: C3,
        highRms: 0.061,
        lowRms: 0.082,
      }),
    ).toBe(true)
  })

  it('hides a solo singer’s own 2nd harmonic', () => {
    /* Same pitches, but the high band sits ~16 dB down — that is C3's overtone
     * leaking past the crossover, not a person. */
    expect(
      shouldShowHighLane({
        highHz: C4,
        lowHz: C3,
        highRms: 0.014,
        lowRms: 0.09,
      }),
    ).toBe(false)
  })

  it('holds the line exactly at the energy floor', () => {
    /* HARMONIC_ENERGY_FLOOR_DB is -12 dB; 10^(-12/20) ≈ 0.2512 of the low band. */
    const atFloor = 0.09 * Math.pow(10, -12 / 20)
    expect(
      shouldShowHighLane({
        highHz: C4,
        lowHz: C3,
        highRms: atFloor,
        lowRms: 0.09,
      }),
    ).toBe(true)
    expect(
      shouldShowHighLane({
        highHz: C4,
        lowHz: C3,
        highRms: atFloor * 0.9,
        lowRms: 0.09,
      }),
    ).toBe(false)
  })
})
