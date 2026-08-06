import { describe, expect, it } from 'vitest'
import { guitarFretLabel } from './guitarLabels'

const E2_MIDI = 40 // open 6th string
const C3_MIDI = 48 // string 5, fret 3
const A_SHARP_2_MIDI = 46 // string 6, fret 6

describe('guitarFretLabel', () => {
  describe('off', () => {
    it('names the open strings, with the octave', () => {
      expect(guitarFretLabel(E2_MIDI, 0, 'off', 'sharp')).toBe('E2')
    })

    it('leaves the fretted cells bare', () => {
      expect(guitarFretLabel(C3_MIDI, 3, 'off', 'sharp')).toBeNull()
    })
  })

  describe('simple', () => {
    it('names every cell without the octave', () => {
      expect(guitarFretLabel(C3_MIDI, 3, 'simple', 'sharp')).toBe('C')
      expect(guitarFretLabel(E2_MIDI, 0, 'simple', 'sharp')).toBe('E')
    })

    it('spells accidentals as sharps', () => {
      expect(guitarFretLabel(A_SHARP_2_MIDI, 6, 'simple', 'sharp')).toBe('A♯')
    })
  })

  describe('advanced', () => {
    it('keeps the octave digit', () => {
      expect(guitarFretLabel(C3_MIDI, 3, 'advanced', 'sharp')).toBe('C3')
      expect(guitarFretLabel(A_SHARP_2_MIDI, 6, 'advanced', 'sharp')).toBe(
        'A♯2',
      )
    })
  })

  describe('flat spelling', () => {
    it('respells the accidentals', () => {
      expect(guitarFretLabel(A_SHARP_2_MIDI, 6, 'simple', 'flat')).toBe('B♭')
      expect(guitarFretLabel(A_SHARP_2_MIDI, 6, 'advanced', 'flat')).toBe('B♭2')
    })

    it('leaves naturals alone', () => {
      expect(guitarFretLabel(C3_MIDI, 3, 'simple', 'flat')).toBe('C')
      /* E is never respelled F♭. */
      expect(guitarFretLabel(E2_MIDI, 0, 'off', 'flat')).toBe('E2')
    })

    it('still hides the fretted cells in off mode', () => {
      expect(guitarFretLabel(A_SHARP_2_MIDI, 6, 'off', 'flat')).toBeNull()
    })
  })
})
