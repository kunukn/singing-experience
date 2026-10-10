import { describe, expect, test } from 'vitest'
import {
  chordAccidentalStyle,
  chordSymbol,
  detectChords,
  MIN_CHORD_PITCH_CLASSES,
  type ChordFamily,
} from './chordDetection'
import type { SungNote } from './scaleDetection'

/* Notes sung in order, half a second each — e.g. sing(60, 64, 67). */
const sing = (...midis: number[]): SungNote[] =>
  midis.map((midi) => ({ midi, durationMs: 500 }))

const symbols = (family: ChordFamily, bass: number | null = null) =>
  family.candidates.map(({ root, type }) => chordSymbol(root, type, bass))

describe('detectChords', () => {
  test('returns no families before anything is sung', () => {
    const result = detectChords([])

    expect(result.families).toEqual([])
    expect(result.bass).toBeNull()
    expect(result.hasEnoughNotes).toBe(false)
  })

  test('names C E G as C major', () => {
    const [top] = detectChords(sing(60, 64, 67)).families

    expect(symbols(top)).toEqual(['C'])
    expect(top.missingPitchClasses).toEqual([])
  })

  test('names A C E as A minor', () => {
    const [top] = detectChords(sing(57, 60, 64)).families

    expect(symbols(top)).toEqual(['Am'])
  })

  test('names C F G as Csus4, with Fsus2 as its twin', () => {
    const [top] = detectChords(sing(60, 65, 67)).families

    expect(symbols(top)).toEqual(['Csus4', 'Fsus2'])
  })

  test('lets the bass pick between twins: C6 over C, Am7 over A', () => {
    const [fromC] = detectChords(sing(60, 64, 67, 69)).families
    const [fromA] = detectChords(sing(57, 60, 64, 67)).families

    expect(symbols(fromC)).toEqual(['C6', 'Am7'])
    expect(symbols(fromA)).toEqual(['Am7', 'C6'])
  })

  test('names C E G B♭ D as C9', () => {
    const [top] = detectChords(sing(60, 64, 67, 70, 74)).families

    expect(symbols(top)).toEqual(['C9'])
  })

  test('groups the four diminished 7ths that share notes', () => {
    const [top] = detectChords(sing(60, 63, 66, 69)).families

    expect(top.candidates).toHaveLength(4)
    expect(top.candidates[0]).toMatchObject({ root: 0, type: 'diminished7' })
  })

  test('ranks exact fits first and lists the notes still missing', () => {
    /* C E — C major still needs its G. */
    const result = detectChords(sing(60, 64))
    const [top] = result.families

    expect(result.hasEnoughNotes).toBe(false)
    expect(symbols(top)).toEqual(['C'])
    expect(top.missingPitchClasses).toEqual([7])
  })

  test('needs at least three different notes for a real guess', () => {
    expect(MIN_CHORD_PITCH_CLASSES).toBe(3)
    expect(detectChords(sing(60, 64, 67)).hasEnoughNotes).toBe(true)
  })

  test('finds nothing for six different notes', () => {
    const result = detectChords(sing(60, 62, 64, 65, 67, 69))

    expect(result.families).toEqual([])
  })

  test('only offers chords whose root was sung', () => {
    /* C E: Am (A C E) would fit, but A was never sung. */
    const result = detectChords(sing(60, 64))
    const roots = result.families.flatMap((family) =>
      family.candidates.map((candidate) => candidate.root),
    )

    expect(new Set(roots)).toEqual(new Set([0, 4]))
  })

  test('reports the lowest note as the bass for slash chords', () => {
    /* E3 G3 C4 — first inversion of C major. */
    const result = detectChords(sing(52, 55, 60))
    const [top] = result.families

    expect(result.bass).toBe(4)
    expect(symbols(top, result.bass)).toEqual(['C/E'])
  })
})

describe('chordSymbol', () => {
  test('spells roots and suffixes the way chord charts do', () => {
    expect(chordSymbol(10, 'major7')).toBe('B♭maj7')
    expect(chordSymbol(6, 'sus4')).toBe('F♯sus4')
    expect(chordSymbol(5, 'minor', 8)).toBe('Fm/A♭')
    expect(chordSymbol(0, 'halfDiminished7')).toBe('Cm7♭5')
  })

  test('spells chord tones from the chord itself', () => {
    expect(chordAccidentalStyle(0, 'dominant7sus4')).toBe('flat') // C F G B♭
    expect(chordAccidentalStyle(0, 'augmented')).toBe('sharp') // C E G♯
    expect(chordAccidentalStyle(2, 'major')).toBe('sharp') // D F♯ A
    expect(chordAccidentalStyle(5, 'minor')).toBe('flat') // F A♭ C
  })
})
