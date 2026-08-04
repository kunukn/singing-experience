import { describe, expect, it } from 'vitest'
import { frequencyToNote, noteToFrequency } from '@/utils/noteUtils'
import type { NoteName } from '@/utils/noteUtils'
import {
  MAX_TONES,
  estimateNoiseFloorDb,
  findPeaks,
  noiseGateToFloorDb,
  sensitivityToAdaptiveRange,
  sieveFundamentals,
  type SpectralPeak,
} from './toneDetection'

/* Production settings — useMultiToneDetection.ts uses exactly these. */
const SAMPLE_RATE = 48000
const FFT_SIZE = 4096
const BIN_WIDTH = SAMPLE_RATE / FFT_SIZE // 11.72 Hz
const BIN_COUNT = FFT_SIZE / 2

const DEFAULT_SENSITIVITY = 5
const DEFAULT_NOISE_GATE = 5

type Partial = { hz: number; db: number }

/*
 * Render partials into a magnitude spectrum in dB.
 *
 * Real analyser output is not one spike per partial — the window function
 * spreads each into a main lobe a few bins wide. Modelling that as a Gaussian
 * matters because findPeaks depends on the shape: it needs strictly decreasing
 * neighbours for the local-maximum test, a raised skirt for the ±2–4 bin
 * prominence window, and three non-equal points for parabolic interpolation.
 * Single-bin spikes would pass trivially and prove nothing.
 */
const LOBE_WIDTH_BINS = 1.1
const NOISE_FLOOR_DB = -110

function buildSpectrum(partials: Partial[]): Float32Array {
  /* Sum in linear amplitude — dB cannot be added. */
  const linear = new Float64Array(BIN_COUNT).fill(
    Math.pow(10, NOISE_FLOOR_DB / 20),
  )

  for (const partial of partials) {
    const centerBin = partial.hz / BIN_WIDTH
    const amplitude = Math.pow(10, partial.db / 20)
    const firstBin = Math.max(0, Math.floor(centerBin - 6))
    const lastBin = Math.min(BIN_COUNT - 1, Math.ceil(centerBin + 6))

    for (let bin = firstBin; bin <= lastBin; bin++) {
      const distance = (bin - centerBin) / LOBE_WIDTH_BINS
      linear[bin] += amplitude * Math.exp(-(distance * distance))
    }
  }

  const spectrum = new Float32Array(BIN_COUNT)
  for (let bin = 0; bin < BIN_COUNT; bin++) {
    spectrum[bin] = 20 * Math.log10(linear[bin])
  }

  return spectrum
}

/* Deterministic PRNG (mulberry32) — noise spectra must be reproducible, or a
 * failing run cannot be investigated. */
function createRandom(seed: number): () => number {
  let state = seed
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/*
 * Broadband noise: every bin jitters around a mean level. This is what room
 * tone, breath and preamp hiss actually look like — a raised floor, not the row
 * of clean spikes it is tempting to model them as. The prominence test in
 * findPeaks is what rejects it, so this exercises a different guard than the
 * lone-peak rule does.
 */
function buildNoiseSpectrum(meanDb: number, spreadDb: number): Float32Array {
  const random = createRandom(0x5eed)
  const raw = new Float32Array(BIN_COUNT)
  for (let bin = 0; bin < BIN_COUNT; bin++) {
    raw[bin] = meanDb + (random() - 0.5) * 2 * spreadDb
  }

  /* Smooth across LOBE_WIDTH_BINS. Adjacent bins of a real analyser are NOT
   * independent — the window function spreads every component over a main lobe,
   * and smoothingTimeConstant correlates frames. Per-bin white noise would be
   * harsher than anything a microphone produces. */
  const spectrum = new Float32Array(BIN_COUNT)
  const radius = 2
  for (let bin = 0; bin < BIN_COUNT; bin++) {
    let sum = 0
    let count = 0
    for (let offset = -radius; offset <= radius; offset++) {
      const neighbour = raw[bin + offset]
      if (neighbour === undefined) continue

      sum += neighbour
      count++
    }
    spectrum[bin] = sum / count
  }

  return spectrum
}

/* A harmonic series with 1/n amplitude falloff — a sawtooth, and a fair stand-in
 * for any bright instrument. This is the timbre the old suppressHarmonics broke
 * on. */
function sawtoothPartials(
  fundamentalHz: number,
  peakDb = -20,
  count = 16,
): Partial[] {
  const partials: Partial[] = []
  for (let n = 1; n <= count; n++) {
    const hz = fundamentalHz * n
    if (hz > 2100) break

    partials.push({ hz, db: peakDb + 20 * Math.log10(1 / n) })
  }

  return partials
}

const hzOf = (note: NoteName, octave: number) => noteToFrequency(note, octave)

/* The full production path: spectrum → peaks → sieve → note names. */
function detectNotes(
  spectrum: Float32Array,
  sensitivity = DEFAULT_SENSITIVITY,
  noiseGate = DEFAULT_NOISE_GATE,
): string[] {
  const peaks = findPeaks(
    spectrum,
    SAMPLE_RATE,
    FFT_SIZE,
    noiseGateToFloorDb(noiseGate),
    sensitivityToAdaptiveRange(sensitivity),
  )

  const seen = new Set<number>()
  const notes: { midi: number; label: string }[] = []

  for (const peak of sieveFundamentals(
    peaks,
    BIN_WIDTH,
    MAX_TONES,
    estimateNoiseFloorDb(spectrum, SAMPLE_RATE, FFT_SIZE),
  )) {
    const info = frequencyToNote(peak.frequency)
    if (!info || seen.has(info.midiNote)) continue

    seen.add(info.midiNote)
    notes.push({ midi: info.midiNote, label: `${info.note}${info.octave}` })
  }

  return notes.sort((a, b) => a.midi - b.midi).map((note) => note.label)
}

describe('buildSpectrum (test harness sanity)', () => {
  it('places a partial where findPeaks can recover its frequency', () => {
    const spectrum = buildSpectrum([{ hz: 440, db: -20 }])
    const peaks = findPeaks(spectrum, SAMPLE_RATE, FFT_SIZE, -80, 20)

    expect(peaks).toHaveLength(1)
    /* Parabolic interpolation should land well inside a semitone of A4. */
    expect(peaks[0].frequency).toBeCloseTo(440, 0)
  })

  it('resolves partials that are far enough apart, per the bin limit', () => {
    /* ~68 Hz apart at ~6 bins — comfortably separable. */
    const spectrum = buildSpectrum([
      { hz: 261.6, db: -20 },
      { hz: 329.6, db: -20 },
    ])

    expect(findPeaks(spectrum, SAMPLE_RATE, FFT_SIZE, -80, 20)).toHaveLength(2)
  })
})

describe('single rich tone', () => {
  /*
   * The regression this whole module exists for. The previous suppressHarmonics
   * only tested n = 2,3,4 against louder peaks, so overtones 5f and up survived
   * and one sawtooth C3 rendered EIGHT cards: C3, E5, G5, A♯5, C6, D6, F♯6, G♯6.
   */
  it('reports one note for a sawtooth C3, not its overtone stack', () => {
    const spectrum = buildSpectrum(sawtoothPartials(hzOf('C', 3)))

    expect(detectNotes(spectrum)).toEqual(['C3'])
  })

  it('reports one note for a sawtooth C4', () => {
    const spectrum = buildSpectrum(sawtoothPartials(hzOf('C', 4)))

    expect(detectNotes(spectrum)).toEqual(['C4'])
  })

  it('reports one note for a sawtooth A2, the densest series in range', () => {
    /* A2 = 110 Hz, so all 16 partials fit under the 2100 Hz ceiling. */
    const spectrum = buildSpectrum(sawtoothPartials(hzOf('A', 2)))

    expect(detectNotes(spectrum)).toEqual(['A2'])
  })

  it('keeps a pure sine tone, which has no overtones to support it', () => {
    /* Guards against a sieve that requires multiple partials to believe a
     * fundamental — the app plays sine tones, and a flute is close to one. */
    const spectrum = buildSpectrum([{ hz: hzOf('C', 4), db: -20 }])

    expect(detectNotes(spectrum)).toEqual(['C4'])
  })

  it('reports the fundamental when its 2nd harmonic is louder', () => {
    /* Common on laptop and phone speakers, and for many sung vowels. The old
     * code processed peaks loudest-first and reported both C3 and C4. */
    const partials = sawtoothPartials(hzOf('C', 3))
    partials[0].db = -26
    partials[1].db = -20

    expect(detectNotes(buildSpectrum(partials))).toEqual(['C3'])
  })
})

describe('chords', () => {
  it('resolves a C major triad at octave 4', () => {
    const spectrum = buildSpectrum([
      ...sawtoothPartials(hzOf('C', 4)),
      ...sawtoothPartials(hzOf('E', 4)),
      ...sawtoothPartials(hzOf('G', 4)),
    ])

    expect(detectNotes(spectrum)).toEqual(['C4', 'E4', 'G4'])
  })

  it('resolves a C major triad at octave 3', () => {
    /* Spacings of ~34 and ~32 Hz — about 3 bins, near the resolution floor. */
    const spectrum = buildSpectrum([
      ...sawtoothPartials(hzOf('C', 3)),
      ...sawtoothPartials(hzOf('E', 3)),
      ...sawtoothPartials(hzOf('G', 3)),
    ])

    expect(detectNotes(spectrum)).toEqual(['C3', 'E3', 'G3'])
  })

  it('resolves two pure sines a fifth apart', () => {
    const spectrum = buildSpectrum([
      { hz: hzOf('C', 4), db: -20 },
      { hz: hzOf('G', 4), db: -20 },
    ])

    expect(detectNotes(spectrum)).toEqual(['C4', 'G4'])
  })

  it('collapses a twelfth to the lower note (documented limitation)', () => {
    /* G4 is C3's 3rd harmonic, so every partial it contributes is already
     * explained by C3. Same class as the octave case below — any integer ratio
     * behaves this way. Confirmed against real oscillators, not just here. */
    const spectrum = buildSpectrum([
      ...sawtoothPartials(hzOf('C', 3)),
      ...sawtoothPartials(hzOf('G', 4)),
    ])

    expect(detectNotes(spectrum)).toEqual(['C3'])
  })

  it('collapses an exact octave to the lower note (documented limitation)', () => {
    /* C5's entire series is a subset of C4's, so no spectral method can tell
     * "C4 + C5" from "C4 with strong even harmonics". See the module header. */
    const spectrum = buildSpectrum([
      ...sawtoothPartials(hzOf('C', 4)),
      ...sawtoothPartials(hzOf('C', 5)),
    ])

    expect(detectNotes(spectrum)).toEqual(['C4'])
  })
})

describe('slider settings', () => {
  it('never collapses a chord, even at the strictest setting', () => {
    /* The trap the 2 dB floor removes. A 0 dB window admits only the single
     * loudest FFT bin, so this triad used to report E4 alone — chosen by
     * bin-level interference, not by anything musical. */
    const spectrum = buildSpectrum([
      ...sawtoothPartials(hzOf('C', 4)),
      ...sawtoothPartials(hzOf('E', 4)),
      ...sawtoothPartials(hzOf('G', 4)),
    ])

    expect(detectNotes(spectrum, 0)).toEqual(['C4', 'E4', 'G4'])
  })

  it('widens monotonically, with every notch doing something', () => {
    /* Guards the remap: the old ×4 mapping ran to 40 dB when nothing changed
     * past ~26, leaving the top third of the slider inert. */
    expect(sensitivityToAdaptiveRange(0)).toBeCloseTo(2, 6)
    expect(sensitivityToAdaptiveRange(5)).toBeCloseTo(14, 6)
    expect(sensitivityToAdaptiveRange(10)).toBeCloseTo(26, 6)

    for (let slider = 1; slider <= 10; slider++) {
      expect(sensitivityToAdaptiveRange(slider)).toBeGreaterThan(
        sensitivityToAdaptiveRange(slider - 1),
      )
    }
  })

  it('reveals a buried voice as the slider rises', () => {
    /* E4 sits 10 dB under the outer voices — invisible when strict, present
     * once the window opens. This is the control's remaining honest job. */
    const spectrum = buildSpectrum([
      ...sawtoothPartials(hzOf('C', 4), -20),
      ...sawtoothPartials(hzOf('E', 4), -30),
      ...sawtoothPartials(hzOf('G', 4), -20),
    ])

    expect(detectNotes(spectrum, 0)).toEqual(['C4', 'G4'])
    expect(detectNotes(spectrum, 10)).toEqual(['C4', 'E4', 'G4'])
  })

  it('reports one note for a rich tone at every sensitivity', () => {
    /* The setting that made the old bug worse: a wider adaptive window let more
     * overtones through as separate notes. */
    const spectrum = buildSpectrum(sawtoothPartials(hzOf('C', 3)))

    for (const sensitivity of [0, 2, 5, 8, 10]) {
      expect(detectNotes(spectrum, sensitivity)).toEqual(['C3'])
    }
  })

  it('reports nothing when the signal is under the noise gate', () => {
    const spectrum = buildSpectrum([{ hz: 440, db: -75 }])

    /* Slider 10 puts the floor at -40 dB. */
    expect(detectNotes(spectrum, DEFAULT_SENSITIVITY, 10)).toEqual([])
  })

  it('hears a quiet tone once the gate is opened', () => {
    const spectrum = buildSpectrum([{ hz: 440, db: -75 }])

    /* Slider 0 puts the floor at -80 dB. */
    expect(detectNotes(spectrum, DEFAULT_SENSITIVITY, 0)).toEqual(['A4'])
  })

  it('never exceeds MAX_TONES', () => {
    const spectrum = buildSpectrum([
      ...sawtoothPartials(hzOf('C', 3)),
      ...sawtoothPartials(hzOf('D', 3)),
      ...sawtoothPartials(hzOf('E', 3)),
      ...sawtoothPartials(hzOf('F', 3)),
      ...sawtoothPartials(hzOf('G', 3)),
      ...sawtoothPartials(hzOf('A', 3)),
      ...sawtoothPartials(hzOf('B', 3)),
      ...sawtoothPartials(hzOf('C', 4)),
      ...sawtoothPartials(hzOf('D', 4)),
      ...sawtoothPartials(hzOf('E', 4)),
    ])

    expect(detectNotes(spectrum).length).toBeLessThanOrEqual(MAX_TONES)
  })
})

describe('lone peaks vs supported series', () => {
  it('ignores a quiet lone peak beside a real note', () => {
    /* A reverb tail, room resonance or consonant transient looks exactly like
     * this: one bin, no harmonic series, well below the real tone. */
    const spectrum = buildSpectrum([
      ...sawtoothPartials(hzOf('C', 4)),
      { hz: 1013, db: -38 },
    ])

    expect(detectNotes(spectrum)).toEqual(['C4'])
  })

  it('still hears a quiet note that has harmonic support', () => {
    /* F5 sits 15 dB under C4 — past the lone-peak limit — but its own series is
     * visible, and that is the evidence noise cannot fake. Needs a wide enough
     * window for the harmonics to clear the peak threshold; at the default the
     * series is cut away first and F5 is correctly judged lone. */
    const spectrum = buildSpectrum([
      ...sawtoothPartials(hzOf('C', 4), -20),
      ...sawtoothPartials(hzOf('F', 5), -35),
    ])

    expect(detectNotes(spectrum, 8)).toContain('F5')
  })

  it('reports nothing for broadband noise', () => {
    /* Real noise is broadband, not a row of clean spikes — it raises the whole
     * floor, so nothing clears the prominence test. */
    const spectrum = buildNoiseSpectrum(-45, 6)

    expect(detectNotes(spectrum)).toEqual([])
  })

  it('hears a note through broadband noise without inventing extra ones', () => {
    const spectrum = buildNoiseSpectrum(-45, 6)
    const tone = buildSpectrum(sawtoothPartials(hzOf('C', 4)))
    /* Sum in linear amplitude — dB cannot be added. */
    for (let bin = 0; bin < spectrum.length; bin++) {
      spectrum[bin] =
        20 *
        Math.log10(
          Math.pow(10, spectrum[bin] / 20) + Math.pow(10, tone[bin] / 20),
        )
    }

    expect(detectNotes(spectrum)).toEqual(['C4'])
  })

  it('keeps a loud lone peak, since a pure tone has no overtones to offer', () => {
    const spectrum = buildSpectrum([{ hz: hzOf('A', 4), db: -20 }])

    expect(detectNotes(spectrum)).toEqual(['A4'])
  })
})

describe('sieveFundamentals', () => {
  /* These cases feed hand-built peak lists with no spectrum behind them, so the
   * noise floor is stated explicitly and set low enough not to be the subject
   * under test — the lone-peak guards have their own describe block above. */
  const QUIET_FLOOR_DB = -100

  const peak = (frequency: number, magnitude: number): SpectralPeak => ({
    frequency,
    magnitude,
  })

  it('returns nothing for an empty peak list', () => {
    expect(sieveFundamentals([], BIN_WIDTH, MAX_TONES, QUIET_FLOOR_DB)).toEqual(
      [],
    )
  })

  it('claims a whole harmonic series for one fundamental', () => {
    const peaks = [
      peak(200, -20),
      peak(400, -26),
      peak(600, -30),
      peak(800, -32),
      peak(1000, -34),
    ]

    const result = sieveFundamentals(
      peaks,
      BIN_WIDTH,
      MAX_TONES,
      QUIET_FLOOR_DB,
    )
    expect(result).toHaveLength(1)
    expect(result[0].frequency).toBe(200)
  })

  it('keeps an unrelated peak as a second fundamental', () => {
    /* 550 Hz is not an integer multiple of 200. */
    const peaks = [peak(200, -20), peak(400, -26), peak(550, -22)]

    const result = sieveFundamentals(
      peaks,
      BIN_WIDTH,
      MAX_TONES,
      QUIET_FLOOR_DB,
    )
    expect(result.map((p) => p.frequency).sort((a, b) => a - b)).toEqual([
      200, 550,
    ])
  })

  it('honours the maxTones cap', () => {
    const peaks = [
      peak(200, -20),
      peak(310, -21),
      peak(430, -22),
      peak(550, -23),
    ]

    expect(sieveFundamentals(peaks, BIN_WIDTH, 2, QUIET_FLOOR_DB)).toHaveLength(
      2,
    )
  })

  it('matches a harmonic that is slightly inharmonic', () => {
    /* +40 cents at the 4th partial, inside the ±50 cent window — real piano
     * strings stretch like this. */
    const stretched = 200 * 4 * Math.pow(2, 40 / 1200)
    const result = sieveFundamentals(
      [peak(200, -20), peak(stretched, -30)],
      BIN_WIDTH,
      MAX_TONES,
      QUIET_FLOOR_DB,
    )

    expect(result).toHaveLength(1)
  })

  it('does not claim a peak well outside the tolerance window', () => {
    /* +150 cents off the 4th partial is a different note, not a stretched one. */
    const offKey = 200 * 4 * Math.pow(2, 150 / 1200)
    const result = sieveFundamentals(
      [peak(200, -20), peak(offKey, -22)],
      BIN_WIDTH,
      MAX_TONES,
      QUIET_FLOOR_DB,
    )

    expect(result).toHaveLength(2)
  })
})
