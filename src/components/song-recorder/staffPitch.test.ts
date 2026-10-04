import { describe, expect, test } from 'vitest'
import { midiToStaffStep, staffPitchY } from './staffPitch'

/* Top line at y=100, 10px between lines → bottom line at y=140. */
const TOP = 100
const SPACING = 10

describe('staffPitch', () => {
  test.each([
    {
      midi: 77,
      clef: 'treble',
      expected: 100,
      name: 'F5 on the treble top line',
    },
    {
      midi: 64,
      clef: 'treble',
      expected: 140,
      name: 'E4 on the treble bottom line',
    },
    {
      midi: 60,
      clef: 'treble',
      expected: 150,
      name: 'middle C one ledger below treble',
    },
    { midi: 57, clef: 'bass', expected: 100, name: 'A3 on the bass top line' },
    {
      midi: 43,
      clef: 'bass',
      expected: 140,
      name: 'G2 on the bass bottom line',
    },
    {
      midi: 60,
      clef: 'bass',
      expected: 90,
      name: 'middle C one ledger above bass',
    },
  ] as const)('places $name', ({ midi, clef, expected }) => {
    expect(staffPitchY(midi, clef, TOP, SPACING)).toBeCloseTo(expected)
  })

  test('puts a sharp halfway between its neighbouring letters', () => {
    expect(midiToStaffStep(61)).toBeCloseTo(
      (midiToStaffStep(60) + midiToStaffStep(62)) / 2,
    )
  })

  test('glides continuously between semitones', () => {
    expect(midiToStaffStep(64.5)).toBeCloseTo(
      (midiToStaffStep(64) + midiToStaffStep(65)) / 2,
    )
  })
})
