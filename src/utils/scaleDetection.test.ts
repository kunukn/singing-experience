import { describe, expect, test } from 'vitest'
import {
  detectScales,
  keyAccidentalStyle,
  pitchClassLabel,
  type ScaleFamily,
  type SungNote,
} from './scaleDetection'

const C = 0
const E_FLAT = 3
const F = 5
const F_SHARP = 6
const A = 9
const B_FLAT = 10
const B = 11

/* Notes sung in order, half a second each — e.g. sing(60, 62, 64). */
const sing = (...midis: number[]): SungNote[] =>
  midis.map((midi) => ({ midi, durationMs: 500 }))

const names = (family: ScaleFamily) =>
  family.candidates.map(({ root, mode }) => `${root}:${mode}`)

describe('detectScales', () => {
  test('returns no families before anything is sung', () => {
    const result = detectScales([])

    expect(result.families).toEqual([])
    expect(result.hasEnoughNotes).toBe(false)
  })

  test('picks C major for C D E F G, with A minor as its first twin', () => {
    const [top] = detectScales(sing(60, 62, 64, 65, 67)).families

    expect(names(top)[0]).toBe(`${C}:ionian`)
    expect(names(top)[1]).toBe(`${A}:aeolian`)
  })

  test('picks A minor for A B C D E, with C major as its first twin', () => {
    const [top] = detectScales(sing(57, 59, 60, 62, 64)).families

    expect(names(top)[0]).toBe(`${A}:aeolian`)
    expect(names(top)[1]).toBe(`${C}:ionian`)
  })

  test('picks C major over B Locrian for B C D E F G', () => {
    const [top] = detectScales(sing(59, 60, 62, 64, 65, 67)).families

    expect(names(top).slice(0, 2)).toEqual([`${C}:ionian`, `${A}:aeolian`])
  })

  test('lets a church mode win when the run starts and ends on its root', () => {
    /* D E F G A B C D */
    const [top] = detectScales(sing(62, 64, 65, 67, 69, 71, 72, 74)).families

    expect(top.candidates[0]).toMatchObject({ root: 2, mode: 'dorian' })
  })

  test('prefers the tightest fit — C D E G A is a whole pentatonic', () => {
    const [top] = detectScales(sing(60, 62, 64, 67, 69)).families

    expect(top.missingPitchClasses).toEqual([])
    expect(names(top)).toEqual([`${C}:majorPentatonic`, `${A}:minorPentatonic`])
  })

  test('groups major and minor blues on the same notes as twins', () => {
    /* A C D E♭ E G — A minor blues, sung from A. */
    const [top] = detectScales(sing(57, 60, 62, 63, 64, 67)).families

    expect(names(top)).toEqual([`${A}:minorBlues`, `${C}:majorBlues`])
  })

  test('drops every scale missing a sung note', () => {
    /* C D E F G plus F♯ — no 7-note scale here holds both F and F♯. */
    const { families } = detectScales(sing(60, 62, 64, 65, 66, 67))

    for (const family of families) {
      expect(family.pitchClasses.has(F)).toBe(true)
      expect(family.pitchClasses.has(F_SHARP)).toBe(true)
    }
    expect(
      families.some((family) =>
        family.candidates.some(({ mode }) => mode === 'ionian'),
      ),
    ).toBe(false)
  })

  test('flags three notes as not enough', () => {
    const result = detectScales(sing(60, 62, 64))

    expect(result.hasEnoughNotes).toBe(false)
    expect(result.families.length).toBeGreaterThan(5)
    expect(result.tieBreaker).toBeNull()
  })

  test('suggests B or B♭ to tell C major from F major', () => {
    const result = detectScales(sing(60, 62, 64, 65, 67))
    const [first, second] = result.families

    expect(first.missingPitchClasses).toHaveLength(
      second.missingPitchClasses.length,
    )
    expect(result.tieBreaker?.pitchClasses).toEqual([B, B_FLAT])
  })

  test('gives no tie-breaker when one family fits best', () => {
    expect(detectScales(sing(60, 62, 64, 67, 69)).tieBreaker).toBeNull()
  })

  test('picks G major when G starts and ends a run without F or F♯', () => {
    /* G A B C D E G fits G major and C major (as G Mixolydian) equally; the
     * familiar name wins. */
    const [top] = detectScales(sing(67, 69, 71, 72, 74, 76, 67)).families

    expect(top.candidates[0]).toMatchObject({ root: 7, mode: 'ionian' })
  })

  test('ignores timing noise between evenly sung notes', () => {
    /* As the segmenter reports a real run: G a millisecond longer than C. */
    const durations = [523, 531, 532, 530, 533]
    const notes = [60, 62, 64, 65, 67].map((midi, index) => ({
      midi,
      durationMs: durations[index],
    }))
    const [top] = detectScales(notes).families

    expect(names(top).slice(0, 2)).toEqual([`${C}:ionian`, `${A}:aeolian`])
  })

  test('caps one long note so it cannot outvote the first note', () => {
    const notes: SungNote[] = [
      { midi: 60, durationMs: 300 },
      { midi: 62, durationMs: 300 },
      { midi: 64, durationMs: 300 },
      { midi: 65, durationMs: 300 },
      { midi: 69, durationMs: 60_000 },
      { midi: 67, durationMs: 300 },
    ]
    const [top] = detectScales(notes).families

    expect(top.candidates[0]).toMatchObject({ root: C, mode: 'ionian' })
  })
})

describe('keyAccidentalStyle', () => {
  test.each([
    { root: F, mode: 'ionian', expected: 'flat' },
    { root: 7, mode: 'ionian', expected: 'sharp' },
    { root: 2, mode: 'aeolian', expected: 'flat' },
    { root: 4, mode: 'aeolian', expected: 'sharp' },
    { root: A, mode: 'minorBlues', expected: 'flat' },
    { root: E_FLAT, mode: 'ionian', expected: 'flat' },
    { root: C, mode: 'ionian', expected: 'sharp' },
  ] as const)(
    'spells $root $mode with $expected',
    ({ root, mode, expected }) => {
      expect(keyAccidentalStyle(root, mode)).toBe(expected)
    },
  )
})

describe('pitchClassLabel', () => {
  test('spells black keys by style', () => {
    expect(pitchClassLabel(B_FLAT, 'flat')).toBe('B♭')
    expect(pitchClassLabel(B_FLAT, 'sharp')).toBe('A♯')
    expect(pitchClassLabel(C, 'flat')).toBe('C')
  })
})
