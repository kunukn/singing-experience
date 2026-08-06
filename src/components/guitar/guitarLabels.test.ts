import { describe, expect, it } from 'vitest'
import { guitarFretLabel } from './guitarLabels'

const E2_MIDI = 40 // open 6th string
const C3_MIDI = 48 // string 5, fret 3
const A_SHARP_2_MIDI = 46 // string 6, fret 6

describe('guitarFretLabel', () => {
  describe('off', () => {
    it('names the open strings, with the octave', () => {
      expect(guitarFretLabel(E2_MIDI, 0, 'off')).toBe('E2')
    })

    it('leaves the fretted cells bare', () => {
      expect(guitarFretLabel(C3_MIDI, 3, 'off')).toBeNull()
    })
  })

  describe('simple', () => {
    it('names every cell without the octave', () => {
      expect(guitarFretLabel(C3_MIDI, 3, 'simple')).toBe('C')
      expect(guitarFretLabel(E2_MIDI, 0, 'simple')).toBe('E')
    })

    it('spells accidentals as sharps', () => {
      expect(guitarFretLabel(A_SHARP_2_MIDI, 6, 'simple')).toBe('A♯')
    })
  })

  describe('advanced', () => {
    it('keeps the octave digit', () => {
      expect(guitarFretLabel(C3_MIDI, 3, 'advanced')).toBe('C3')
      expect(guitarFretLabel(A_SHARP_2_MIDI, 6, 'advanced')).toBe('A♯2')
    })
  })
})
