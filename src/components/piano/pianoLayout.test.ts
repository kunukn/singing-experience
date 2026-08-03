import { describe, expect, it } from 'vitest'
import { buildPianoLayout, SEMITONE_UNIT } from './pianoLayout'

/* Voice-range endpoints under test */
const EVERYONE = { midiMin: 55, midiMax: 67 } // G3–G4
const FULL = { midiMin: 36, midiMax: 96 } // C2–C7

describe('buildPianoLayout', () => {
  it('places every semitone an equal px distance apart (linear pitch axis)', () => {
    for (const range of [EVERYONE, FULL]) {
      const { whites, blacks } = buildPianoLayout(range.midiMin, range.midiMax)
      const byMidi = [...whites, ...blacks].sort((a, b) => a.midi - b.midi)

      for (let index = 1; index < byMidi.length; index++) {
        expect(byMidi[index].pitchX - byMidi[index - 1].pitchX).toBeCloseTo(
          SEMITONE_UNIT,
        )
      }
    }
  })

  it('makes E/F/B/C 1.5 units wide and D/G/A 2 units (interior keys)', () => {
    const { whites } = buildPianoLayout(FULL.midiMin, FULL.midiMax)
    const widthOf = (midi: number) =>
      whites.find((key) => key.midi === midi)!.widthPx

    // C4=60 D4=62 E4=64 F4=65 G4=67 A4=69 B4=71 — all interior in C2–C7
    for (const midi of [64, 65, 71, 60]) {
      expect(widthOf(midi)).toBeCloseTo(1.5 * SEMITONE_UNIT)
    }
    for (const midi of [62, 67, 69]) {
      expect(widthOf(midi)).toBeCloseTo(2 * SEMITONE_UNIT)
    }
  })

  it('starts at G3 and ends at G4 for the Everyone range', () => {
    const { whites, totalWidth } = buildPianoLayout(
      EVERYONE.midiMin,
      EVERYONE.midiMax,
    )
    expect(whites[0].midi).toBe(55) // G3
    expect(whites[whites.length - 1].midi).toBe(67) // G4
    expect(whites[0].leftPx).toBe(0)
    expect(
      whites[whites.length - 1].leftPx + whites[whites.length - 1].widthPx,
    ).toBeCloseTo(totalWidth)
  })

  it('keeps each black key centered on its pitch position', () => {
    const { blacks } = buildPianoLayout(EVERYONE.midiMin, EVERYONE.midiMax)
    for (const key of blacks) {
      expect(key.leftPx + key.widthPx / 2).toBeCloseTo(key.pitchX)
    }
  })

  it('labels only C keys', () => {
    const { whites, blacks } = buildPianoLayout(FULL.midiMin, FULL.midiMax)
    const labelled = [...whites, ...blacks].filter((key) => key.label !== null)
    expect(labelled.every((key) => key.midi % 12 === 0)).toBe(true)
    expect(labelled.map((key) => key.label)).toEqual([
      'C2',
      'C3',
      'C4',
      'C5',
      'C6',
      'C7',
    ])
  })
})
