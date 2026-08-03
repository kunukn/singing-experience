import { describe, expect, it } from 'vitest'
import {
  buildPianoLayout,
  pianoPitchXForMidi,
  pianoSpanUnits,
  SEMITONE_UNIT,
} from './pianoLayout'

/* Voice-range endpoints under test */
const EVERYONE = { midiMin: 55, midiMax: 67 } // G3–G4
const FULL = { midiMin: 36, midiMax: 96 } // C2–C7

describe('buildPianoLayout', () => {
  /* The core invariant: hint lines are drawn at pitchX, so equal spacing here
   * means D3→D♯3 measures the same px as D♯3→E3 and E3→F3. */
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

  it('makes E/F/B/C 1.5 units wide and D/G/A 2 units, including the end keys', () => {
    const { whites } = buildPianoLayout(FULL.midiMin, FULL.midiMax)
    const widthOf = (midi: number) =>
      whites.find((key) => key.midi === midi)!.widthPx

    // C2=36 (first) C4=60 E4=64 F4=65 B4=71 C7=96 (last) — all 1.5 units, no
    // truncated end keys.
    for (const midi of [36, 60, 64, 65, 71, 96]) {
      expect(widthOf(midi)).toBeCloseTo(1.5 * SEMITONE_UNIT)
    }
    for (const midi of [62, 67, 69]) {
      expect(widthOf(midi)).toBeCloseTo(2 * SEMITONE_UNIT)
    }
  })

  it('gives every C key the same width (first, interior, and last)', () => {
    const { whites } = buildPianoLayout(FULL.midiMin, FULL.midiMax)
    const cWidths = whites
      .filter((key) => key.midi % 12 === 0)
      .map((key) => key.widthPx)

    expect(cWidths).toHaveLength(6) // C2..C7
    for (const width of cWidths) {
      expect(width).toBeCloseTo(cWidths[0])
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

  it('offsets pitchX from the rectangle center on C/E/F/B only', () => {
    const { whites } = buildPianoLayout(FULL.midiMin, FULL.midiMax)
    const offsetOf = (midi: number) => {
      const key = whites.find((entry) => entry.midi === midi)!

      return key.pitchX - (key.leftPx + key.widthPx / 2)
    }

    /* C4 and F4 have their 1-semitone neighbour below, so the rectangle extends
     * further above the pitch and its center lands right of pitchX. */
    expect(offsetOf(60)).toBeCloseTo(-0.25 * SEMITONE_UNIT)
    expect(offsetOf(65)).toBeCloseTo(-0.25 * SEMITONE_UNIT)
    // E4 and B4 are the mirror case — pitch sits right of center
    expect(offsetOf(64)).toBeCloseTo(0.25 * SEMITONE_UNIT)
    expect(offsetOf(71)).toBeCloseTo(0.25 * SEMITONE_UNIT)
    // D4 / G4 / A4 are symmetric — pitch is the rectangle center
    for (const midi of [62, 67, 69]) {
      expect(offsetOf(midi)).toBeCloseTo(0)
    }
  })

  it('exposes the pitch axis so callers can map a midi to x', () => {
    const { midiMin, midiMax, originPitch, unit } = buildPianoLayout(
      FULL.midiMin,
      FULL.midiMax,
    )
    expect(midiMin).toBe(FULL.midiMin)
    expect(midiMax).toBe(FULL.midiMax)
    expect(unit).toBe(SEMITONE_UNIT)
    // C2's rectangle starts half a unit below its pitch (B1 is 1 semitone down)
    expect(originPitch).toBeCloseTo(FULL.midiMin - 0.5)
  })

  it('scales every dimension linearly with a custom unit', () => {
    const base = buildPianoLayout(EVERYONE.midiMin, EVERYONE.midiMax)
    const doubled = buildPianoLayout(
      EVERYONE.midiMin,
      EVERYONE.midiMax,
      SEMITONE_UNIT * 2,
    )

    expect(doubled.totalWidth).toBeCloseTo(base.totalWidth * 2)
    for (const [index, key] of doubled.whites.entries()) {
      expect(key.leftPx).toBeCloseTo(base.whites[index].leftPx * 2)
      expect(key.widthPx).toBeCloseTo(base.whites[index].widthPx * 2)
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

describe('pianoPitchXForMidi', () => {
  const layout = buildPianoLayout(FULL.midiMin, FULL.midiMax)

  it('lands an exact note on that key’s pitch position', () => {
    for (const key of [...layout.whites, ...layout.blacks]) {
      expect(pianoPitchXForMidi(layout, key.midi)).toBeCloseTo(key.pitchX)
    }
  })

  it('is linear in cents everywhere, including across E→F', () => {
    const cent = SEMITONE_UNIT / 100
    // 64 = E4, the boundary where rectangle-center spacing used to double
    for (const midi of [60, 62, 64, 65, 71]) {
      const step = pianoPitchXForMidi(layout, midi + 0.5)
      expect(step - pianoPitchXForMidi(layout, midi)).toBeCloseTo(50 * cent)
    }
  })

  it('clamps outside the keyboard range', () => {
    expect(pianoPitchXForMidi(layout, 12)).toBeCloseTo(
      pianoPitchXForMidi(layout, FULL.midiMin),
    )
    expect(pianoPitchXForMidi(layout, 120)).toBeCloseTo(
      pianoPitchXForMidi(layout, FULL.midiMax),
    )
  })
})

describe('pianoSpanUnits', () => {
  it('measures the keyboard in semitone units, outer edge to outer edge', () => {
    // G3–G4: G's neighbouring naturals are F and A, 2 semitones out on each
    // side, so the 12-semitone range spans 14 units.
    expect(pianoSpanUnits(EVERYONE.midiMin, EVERYONE.midiMax)).toBe(14)
    // C2–C7: C's neighbours are B (1 semitone below) and D (2 above), so the
    // 60-semitone range gains a 0.5-unit left edge and a 1-unit right edge.
    expect(pianoSpanUnits(FULL.midiMin, FULL.midiMax)).toBe(61.5)
  })

  it('matches totalWidth for any unit — the invariant fit-to-container solves', () => {
    for (const range of [EVERYONE, FULL]) {
      const span = pianoSpanUnits(range.midiMin, range.midiMax)
      for (const unit of [17, SEMITONE_UNIT, 36, 48]) {
        const { totalWidth } = buildPianoLayout(
          range.midiMin,
          range.midiMax,
          unit,
        )
        expect(totalWidth).toBeCloseTo(span * unit)
      }
    }
  })

  it('ignores accidental endpoints, since only white keys bound the track', () => {
    // A3–A5 (Mezzo-Soprano) vs the same range widened to the enclosing
    // accidentals — the white-key extremes, and so the span, are unchanged.
    expect(pianoSpanUnits(57, 81)).toBe(pianoSpanUnits(56, 82))
  })
})
