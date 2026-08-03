import { describe, expect, it } from 'vitest'
import { pianoKeyLabel } from './pianoLabels'
import { buildPianoLayout, type PianoKey } from './pianoLayout'

const RANGE = { midiMin: 57, midiMax: 81 } // A3–A5, the Mezzo-Soprano range
const layout = buildPianoLayout(RANGE.midiMin, RANGE.midiMax)

const keyFor = (midi: number): PianoKey =>
  [...layout.whites, ...layout.blacks].find((key) => key.midi === midi)!

const labelFor = (midi: number, mode: 'off' | 'simple' | 'advanced') =>
  pianoKeyLabel(keyFor(midi), mode, RANGE)

describe('pianoKeyLabel', () => {
  describe("mode 'off'", () => {
    it('labels the C keys with their octave marker', () => {
      expect(labelFor(60, 'off')).toBe('C4')
      expect(labelFor(72, 'off')).toBe('C5')
    })

    it('labels both range edges with the octave', () => {
      expect(labelFor(RANGE.midiMin, 'off')).toBe('A3')
      expect(labelFor(RANGE.midiMax, 'off')).toBe('A5')
    })

    it('labels a black key only when it is a range edge', () => {
      expect(labelFor(61, 'off')).toBeNull() // C♯4, mid-range
      expect(
        pianoKeyLabel(keyFor(70), 'off', { midiMin: 70, midiMax: 81 }),
      ).toBe('A♯4')
    })

    it('leaves every other key unlabelled', () => {
      expect(labelFor(62, 'off')).toBeNull() // D4
      expect(labelFor(71, 'off')).toBeNull() // B4
    })
  })

  it("labels every key without the octave in 'simple'", () => {
    expect(labelFor(60, 'simple')).toBe('C')
    expect(labelFor(61, 'simple')).toBe('C♯')
    expect(labelFor(62, 'simple')).toBe('D')
  })

  it("labels every key with the octave in 'advanced'", () => {
    expect(labelFor(60, 'advanced')).toBe('C4')
    expect(labelFor(61, 'advanced')).toBe('C♯4')
    expect(labelFor(62, 'advanced')).toBe('D4')
  })
})
