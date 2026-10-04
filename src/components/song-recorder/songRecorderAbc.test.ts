import { describe, expect, test } from 'vitest'
import type { QuantizedNote } from './quantizeNotes'
import {
  buildRecordingAbc,
  chooseClef,
  writableLengths,
} from './songRecorderAbc'

const OPTIONS = { bpm: 90, grid: 8, beatsPerBar: 4, clef: 'treble' } as const

function body(notes: QuantizedNote[], options = OPTIONS) {
  return buildRecordingAbc(notes, options).abc.split('\n').at(-1)
}

describe('songRecorderAbc', () => {
  test('lists writable lengths longest first', () => {
    expect(writableLengths(8)).toEqual([8, 6, 4, 3, 2, 1])
    expect(writableLengths(16)).toEqual([16, 12, 8, 6, 4, 3, 2, 1])
  })

  test('writes the header with meter, unit, tempo and clef', () => {
    const { abc } = buildRecordingAbc([], { ...OPTIONS, clef: 'bass' })

    expect(abc.split('\n').slice(0, 5)).toEqual([
      'X:1',
      'M:4/4',
      'L:1/8',
      'Q:1/4=90',
      'K:C clef=bass',
    ])
  })

  test('writes a half note and a half rest in one bar', () => {
    expect(
      body([
        { midi: 62, startUnit: 0, units: 4 },
        { midi: null, startUnit: 4, units: 4 },
      ]),
    ).toBe('D4 z4 |]')
  })

  test('ties a five-eighth note as half + eighth', () => {
    expect(
      body([
        { midi: 60, startUnit: 0, units: 5 },
        { midi: null, startUnit: 5, units: 3 },
      ]),
    ).toBe('C4- C z3 |]')
  })

  test('ties a note across the bar line', () => {
    const { abc, pieces } = buildRecordingAbc(
      [
        { midi: null, startUnit: 0, units: 6 },
        { midi: 67, startUnit: 6, units: 4 },
        { midi: null, startUnit: 10, units: 6 },
      ],
      OPTIONS,
    )

    expect(abc.split('\n').at(-1)).toBe('z6 G2- | G2 z6 |]')
    expect(pieces.map((piece) => piece.noteIndex)).toEqual([0, 1, 1, 2])
  })

  test('beams eighths within a beat but not across beats', () => {
    expect(
      body([
        { midi: 60, startUnit: 0, units: 1 },
        { midi: 62, startUnit: 1, units: 1 },
        { midi: 64, startUnit: 2, units: 1 },
        { midi: 65, startUnit: 3, units: 1 },
        { midi: null, startUnit: 4, units: 4 },
      ]),
    ).toBe('CD EF z4 |]')
  })

  test('writes a natural after a sharp of the same pitch in one bar', () => {
    expect(
      body([
        { midi: 61, startUnit: 0, units: 2 },
        { midi: 60, startUnit: 2, units: 2 },
        { midi: null, startUnit: 4, units: 4 },
      ]),
    ).toBe('^C2 =C2 z4 |]')
  })

  test('forgets accidentals at the bar line', () => {
    expect(
      body([
        { midi: 61, startUnit: 0, units: 8 },
        { midi: 60, startUnit: 8, units: 8 },
      ]),
    ).toBe('^C8 | C8 |]')
  })

  test('returns one piece per drawn head', () => {
    const { pieces } = buildRecordingAbc(
      [
        { midi: 60, startUnit: 0, units: 7 },
        { midi: null, startUnit: 7, units: 1 },
      ],
      OPTIONS,
    )

    /* 7 → 6 + 1 (dotted half tied to an eighth), then the eighth rest. */
    expect(pieces).toEqual([
      { noteIndex: 0, startUnit: 0, units: 6, isRest: false },
      { noteIndex: 0, startUnit: 6, units: 1, isRest: false },
      { noteIndex: 1, startUnit: 7, units: 1, isRest: true },
    ])
  })

  test.each([
    { midis: [60, 64, 67], expected: 'treble' },
    { midis: [43, 48, 52], expected: 'bass' },
    { midis: [], expected: 'treble' },
  ])('chooses $expected clef for $midis', ({ midis, expected }) => {
    expect(chooseClef(midis)).toBe(expected)
  })
})
