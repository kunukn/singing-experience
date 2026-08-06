import { describe, expect, it } from 'vitest'
import { pianoKeyAltLabel, pianoKeyLabel } from './pianoLabels'
import { buildPianoLayout, type PianoKey } from './pianoLayout'

const RANGE = { midiMin: 57, midiMax: 81 } // A3–A5, the Mezzo-Soprano range
const layout = buildPianoLayout(RANGE.midiMin, RANGE.midiMax)

const keyFor = (midi: number): PianoKey =>
  [...layout.whites, ...layout.blacks].find((key) => key.midi === midi)!

const labelFor = (midi: number, mode: 'off' | 'simple' | 'advanced') =>
  pianoKeyLabel(keyFor(midi), mode, RANGE, 'sharp')

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
        pianoKeyLabel(keyFor(70), 'off', { midiMin: 70, midiMax: 81 }, 'sharp'),
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

describe('pianoKeyAltLabel', () => {
  const altFor = (midi: number, mode: 'off' | 'simple' | 'advanced') =>
    pianoKeyAltLabel(keyFor(midi), mode, 'sharp')

  it('spells the black keys as flats under a sharp label', () => {
    expect(altFor(61, 'simple')).toBe('D♭')
    expect(altFor(63, 'simple')).toBe('E♭')
    expect(altFor(66, 'simple')).toBe('G♭')
  })

  it("omits the octave even in 'advanced'", () => {
    expect(altFor(66, 'advanced')).toBe('G♭') // paired with F♯4 above it
  })

  it("stays silent in 'off'", () => {
    expect(altFor(61, 'off')).toBeNull()
    expect(
      /* Even the range edge, where pianoKeyLabel does still draw a sharp. */
      pianoKeyAltLabel(keyFor(70), 'off', 'sharp'),
    ).toBeNull()
  })

  it('leaves the white keys bare in every mode', () => {
    expect(altFor(60, 'simple')).toBeNull() // C
    expect(altFor(64, 'simple')).toBeNull() // E — never spelled F♭
    expect(altFor(71, 'advanced')).toBeNull() // B — never spelled C♭
  })
})

/* The stacked pair swaps places: the picked style leads and carries the octave,
 * the other spelling drops to the second row. Neither is ever dropped. */
describe('flat spelling', () => {
  const labelForFlat = (midi: number, mode: 'off' | 'simple' | 'advanced') =>
    pianoKeyLabel(keyFor(midi), mode, RANGE, 'flat')
  const altForFlat = (midi: number, mode: 'off' | 'simple' | 'advanced') =>
    pianoKeyAltLabel(keyFor(midi), mode, 'flat')

  it('leads with the flat and follows with the sharp', () => {
    expect(labelForFlat(61, 'advanced')).toBe('D♭4')
    expect(altForFlat(61, 'advanced')).toBe('C♯')
  })

  it("drops the octave from both rows in 'simple'", () => {
    expect(labelForFlat(66, 'simple')).toBe('G♭')
    expect(altForFlat(66, 'simple')).toBe('F♯')
  })

  it('leaves the naturals untouched in both rows', () => {
    expect(labelForFlat(64, 'advanced')).toBe('E4') // never spelled F♭
    expect(altForFlat(64, 'advanced')).toBeNull()
    expect(labelForFlat(60, 'off')).toBe('C4') // the octave marker
  })

  it("respells a black-key range edge in 'off'", () => {
    expect(
      pianoKeyLabel(keyFor(70), 'off', { midiMin: 70, midiMax: 81 }, 'flat'),
    ).toBe('B♭4')
    expect(pianoKeyAltLabel(keyFor(70), 'off', 'flat')).toBeNull()
  })
})
