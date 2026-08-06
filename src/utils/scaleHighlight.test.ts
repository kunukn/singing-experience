import { SCALE_MODE_SEMITONES } from '@/utils/noteUtils'
import { describe, expect, it } from 'vitest'
import {
  buildScalePitchClasses,
  pitchClassOf,
  SCALE_HIGHLIGHT_MODES,
  SCALE_ROOT_OPTIONS,
  scaleEmphasisFor,
  scaleRoleForMidi,
} from './scaleHighlight'

const C = 0
const D = 2
const A = 9

const sorted = (pitchClasses: ReadonlySet<number>) =>
  [...pitchClasses].toSorted((a, b) => a - b)

describe('pitchClassOf', () => {
  it('maps every C to 0 regardless of octave', () => {
    expect(pitchClassOf(60)).toBe(0)
    expect(pitchClassOf(24)).toBe(0)
  })

  it('stays positive below MIDI 0', () => {
    expect(pitchClassOf(-1)).toBe(11)
  })
})

describe('buildScalePitchClasses', () => {
  it('drops the duplicated octave from the semitone table', () => {
    expect(SCALE_MODE_SEMITONES.ionian).toHaveLength(8) // includes the octave
    expect(buildScalePitchClasses(C, 'ionian').size).toBe(7)
  })

  it('builds C major', () => {
    expect(sorted(buildScalePitchClasses(C, 'ionian'))).toEqual([
      0, 2, 4, 5, 7, 9, 11,
    ])
  })

  it('wraps past B when the scale crosses the octave', () => {
    /* D major — F♯ (6) and C♯ (1); C♯ wraps back below the root. */
    expect(sorted(buildScalePitchClasses(D, 'ionian'))).toEqual([
      1, 2, 4, 6, 7, 9, 11,
    ])
  })

  it('gives A minor the same pitch classes as C major', () => {
    expect(sorted(buildScalePitchClasses(A, 'aeolian'))).toEqual(
      sorted(buildScalePitchClasses(C, 'ionian')),
    )
  })

  it('keeps pentatonic scales at five tones and blues at six', () => {
    expect(buildScalePitchClasses(C, 'majorPentatonic').size).toBe(5)
    expect(buildScalePitchClasses(A, 'minorPentatonic').size).toBe(5)
    expect(buildScalePitchClasses(C, 'majorBlues').size).toBe(6)
    expect(buildScalePitchClasses(A, 'minorBlues').size).toBe(6)
  })

  it('is empty when highlighting is off', () => {
    expect(buildScalePitchClasses(null, 'ionian').size).toBe(0)
  })
})

describe('scaleRoleForMidi', () => {
  const dMajor = buildScalePitchClasses(D, 'ionian')

  it('marks the tonic in every octave as the root', () => {
    expect(scaleRoleForMidi(50, D, dMajor)).toBe('root') // D3
    expect(scaleRoleForMidi(74, D, dMajor)).toBe('root') // D5
  })

  it('marks the other scale tones as scale members', () => {
    expect(scaleRoleForMidi(66, D, dMajor)).toBe('scale') // F♯4
    expect(scaleRoleForMidi(61, D, dMajor)).toBe('scale') // C♯4
  })

  it('leaves non-members unmarked', () => {
    expect(scaleRoleForMidi(65, D, dMajor)).toBeNull() // F4
    expect(scaleRoleForMidi(60, D, dMajor)).toBeNull() // C4
  })

  it('marks nothing when highlighting is off', () => {
    expect(
      scaleRoleForMidi(62, null, buildScalePitchClasses(null, 'ionian')),
    ).toBeNull()
  })
})

describe('scaleEmphasisFor', () => {
  it('emphasizes every scale member', () => {
    expect(scaleEmphasisFor('root')).toBe('emphasized')
    expect(scaleEmphasisFor('scale')).toBe('emphasized')
  })

  /* Covers both null-role cases at once, which is the point of the rule: a note
   * a chosen scale leaves out and every note on a board with no scale on it read
   * the same way. Emphasis is earned by membership, and neither has any. */
  it('steps back every note that belongs to no scale', () => {
    expect(scaleEmphasisFor(null)).toBe('diminished')
  })
})

describe('option lists', () => {
  it('offers one root per pitch class, spelled both ways where accidental', () => {
    expect(SCALE_ROOT_OPTIONS).toHaveLength(12)
    expect(SCALE_ROOT_OPTIONS[0]).toEqual({ pitchClass: 0, label: 'C' })
    expect(SCALE_ROOT_OPTIONS[1]).toEqual({
      pitchClass: 1,
      label: 'C♯ / D♭',
    })
  })

  it('only names modes that noteUtils can build', () => {
    for (const mode of SCALE_HIGHLIGHT_MODES) {
      expect(SCALE_MODE_SEMITONES[mode]).toBeDefined()
    }
  })
})
