import { describe, expect, test } from 'vitest'
import { guitarTuningStrings } from '@/utils/guitarTunings'
import { A4_FREQUENCY, noteToFrequency } from '@/utils/noteUtils'
import {
  findNearestString,
  NEAREST_STRING_MAX_CENTS,
  nearestStringBadge,
} from './nearestString'

const standardGuitar = guitarTuningStrings('standard')

/* Re-entrant high-G ukulele, in the tuner's headstock order: G4 is not the lowest string */
const highGUkulele = [
  { note: 'C', octave: 4 },
  { note: 'G', octave: 4 },
  { note: 'E', octave: 4 },
  { note: 'A', octave: 4 },
] as const

describe('findNearestString', () => {
  test.each([
    { note: 'E', octave: 3, expected: 'D3', cents: 200 },
    { note: 'C', octave: 3, expected: 'D3', cents: -200 },
    { note: 'A', octave: 2, expected: 'A2', cents: 0 },
    { note: 'F', octave: 4, expected: 'E4', cents: 100 },
  ] as const)(
    'points $note$octave at $expected with $cents cents',
    ({ note, octave, expected, cents }) => {
      const nearest = findNearestString(
        standardGuitar,
        noteToFrequency(note, octave),
        A4_FREQUENCY,
      )

      expect(`${nearest?.string.note}${nearest?.string.octave}`).toBe(expected)
      expect(nearest?.cents).toBe(cents)
    },
  )

  test('measures against the reference pitch', () => {
    const nearest = findNearestString(
      standardGuitar,
      noteToFrequency('D', 3, 432),
      432,
    )

    expect(nearest?.string).toEqual({ note: 'D', octave: 3 })
    expect(nearest?.cents).toBe(0)
  })

  test('picks across both sides of a re-entrant ukulele', () => {
    const nearest = findNearestString(
      highGUkulele,
      noteToFrequency('F', 4),
      A4_FREQUENCY,
    )

    expect(nearest?.string).toEqual({ note: 'E', octave: 4 })
    expect(nearest?.cents).toBe(100)
  })

  test('returns null beyond the maximum distance from every string', () => {
    const tooHigh =
      noteToFrequency('E', 4) * 2 ** (NEAREST_STRING_MAX_CENTS / 1200 + 0.01)

    expect(findNearestString(standardGuitar, tooHigh, A4_FREQUENCY)).toBeNull()
  })

  test('returns null for no strings or an invalid frequency', () => {
    expect(findNearestString([], 440, A4_FREQUENCY)).toBeNull()
    expect(findNearestString(standardGuitar, 0, A4_FREQUENCY)).toBeNull()
  })
})

describe('nearestStringBadge', () => {
  test.each([
    { cents: 200, expected: '▲2' },
    { cents: -200, expected: '▼2' },
    { cents: 26, expected: '▲' },
    { cents: -49, expected: '▼' },
    { cents: 151, expected: '▲2' },
  ])('labels $cents cents as $expected', ({ cents, expected }) => {
    expect(nearestStringBadge(cents)).toBe(expected)
  })
})
