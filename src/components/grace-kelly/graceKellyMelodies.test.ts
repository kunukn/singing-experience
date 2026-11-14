import { describe, expect, test } from 'vitest'
import { vozMidiRange } from './graceKellyMelodies'

const G2 = 43
const C3 = 48

/* VOZ_MELODIES indices */
const REALLY_HIGH = 1
const ONE_TONE = 3
const LOW = 5

describe('vozMidiRange', () => {
  test.each([
    {
      name: 'the lowest and the highest part',
      vozIndices: [REALLY_HIGH, LOW],
      startToneMidi: G2,
      expected: { midiMin: 43, midiMax: 79 },
    },
    {
      name: 'the same parts from a higher start tone',
      vozIndices: [REALLY_HIGH, LOW],
      startToneMidi: C3,
      expected: { midiMin: 48, midiMax: 84 },
    },
    {
      name: 'the one-tone part alone',
      vozIndices: [ONE_TONE],
      startToneMidi: G2,
      expected: { midiMin: 55, midiMax: 55 },
    },
  ])('should span $name', ({ vozIndices, startToneMidi, expected }) => {
    expect(vozMidiRange(vozIndices, startToneMidi)).toEqual(expected)
  })

  test('should have no range when no part is given', () => {
    expect(vozMidiRange([], G2)).toBeNull()
  })
})
