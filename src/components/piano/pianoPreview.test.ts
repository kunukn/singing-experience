import { describe, expect, it } from 'vitest'
import { midiToFrequency } from '@/utils/noteUtils'
import { buildPianoLayout } from './pianoLayout'
import {
  PREVIEW_LABEL_COLLISION_PX,
  buildPianoPreviewLine,
  buildPianoPreviewLines,
  type PianoPreviewLaneId,
} from './pianoPreview'

const FULL = { midiMin: 36, midiMax: 96 } // C2–C7
const layout = buildPianoLayout(FULL.midiMin, FULL.midiMax)

function lineFor(overrides: {
  previewMidi: number | null
  previewFrequency: number | null
  previewNoteLabel: string | null
}) {
  return buildPianoPreviewLine({ ...overrides, layout })
}

const pitchXOf = (midi: number) =>
  [...layout.whites, ...layout.blacks].find((key) => key.midi === midi)!.pitchX

describe('buildPianoPreviewLine', () => {
  it('returns null without a clean pitch', () => {
    expect(
      lineFor({
        previewMidi: null,
        previewFrequency: 440,
        previewNoteLabel: 'A4',
      }),
    ).toBeNull()
    expect(
      lineFor({
        previewMidi: 69,
        previewFrequency: 440,
        previewNoteLabel: null,
      }),
    ).toBeNull()
  })

  it('returns null when more than 12 semitones outside the range', () => {
    expect(
      lineFor({
        previewMidi: 109,
        previewFrequency: midiToFrequency(109),
        previewNoteLabel: 'C♯8',
      }),
    ).toBeNull()
  })

  it('places an exact white note on its key’s hint line', () => {
    const line = lineFor({
      previewMidi: 60,
      previewFrequency: midiToFrequency(60), // exactly C4
      previewNoteLabel: 'C4',
    })
    expect(line).not.toBeNull()
    expect(line!.x).toBeCloseTo(pitchXOf(60))
    expect(line!.text).toBe('C4')
  })

  it('places an exact black note on its key’s hint line', () => {
    const line = lineFor({
      previewMidi: 61,
      previewFrequency: midiToFrequency(61), // exactly C#4
      previewNoteLabel: 'C♯4',
    })
    expect(line!.x).toBeCloseTo(pitchXOf(61))
    expect(line!.text).toBe('C♯4')
  })

  it('appends a signed cents suffix once past the 20¢ threshold', () => {
    const sharp = midiToFrequency(60) * Math.pow(2, 35 / 1200) // +35¢ above C4
    expect(
      lineFor({
        previewMidi: 60,
        previewFrequency: sharp,
        previewNoteLabel: 'C4',
      })!.text,
    ).toMatch(/C4 \+\d+¢/)

    const nearlyClean = midiToFrequency(60) * Math.pow(2, 10 / 1200) // +10¢ < threshold
    expect(
      lineFor({
        previewMidi: 60,
        previewFrequency: nearlyClean,
        previewNoteLabel: 'C4',
      })!.text,
    ).toBe('C4')
  })

  it('pins x to the keyboard edges for in-tolerance out-of-range pitches', () => {
    // Just below C2 (within the 12-semitone tolerance) → pin to the far-left edge
    const below = lineFor({
      previewMidi: 35,
      previewFrequency: midiToFrequency(35),
      previewNoteLabel: 'B1',
    })
    expect(below!.x).toBe(0)

    // Above C7 → pin to the far-right edge
    const above = lineFor({
      previewMidi: 98,
      previewFrequency: midiToFrequency(98),
      previewNoteLabel: 'D7',
    })
    expect(above!.x).toBeCloseTo(layout.totalWidth)
  })
})

describe('accidental spelling', () => {
  const A_SHARP_4_MIDI = 70

  const chipFor = (accidentalStyle: 'sharp' | 'flat', centsOff = 0) =>
    buildPianoPreviewLine({
      layout,
      accidentalStyle,
      previewMidi: A_SHARP_4_MIDI,
      previewFrequency:
        midiToFrequency(A_SHARP_4_MIDI) * Math.pow(2, centsOff / 1200),
      previewNoteLabel: 'A♯4',
    })?.text

  it('leaves the chip label exactly as the detector spelled it', () => {
    /* Sharp mode passes previewNoteLabel straight through — no re-derivation, so
     * nothing about the existing behaviour can drift. */
    expect(chipFor('sharp')).toBe('A♯4')
  })

  it('respells the chip to match a flat keyboard', () => {
    expect(chipFor('flat')).toBe('B♭4')
  })

  it('keeps the cents suffix when respelling', () => {
    expect(chipFor('flat', 40)).toBe('B♭4 +40¢')
  })

  it('defaults to the sharp spelling when no style is given', () => {
    expect(
      lineFor({
        previewMidi: A_SHARP_4_MIDI,
        previewFrequency: midiToFrequency(A_SHARP_4_MIDI),
        previewNoteLabel: 'A♯4',
      })!.text,
    ).toBe('A♯4')
  })
})

describe('buildPianoPreviewLines', () => {
  const laneFor = (
    laneId: PianoPreviewLaneId,
    midi: number | null,
    label: string | null,
  ) => ({
    laneId,
    layout,
    previewMidi: midi,
    previewFrequency: midi === null ? null : midiToFrequency(midi),
    previewNoteLabel: label,
  })

  it('returns nothing when no lane has a clean pitch', () => {
    expect(
      buildPianoPreviewLines([
        laneFor('low', null, null),
        laneFor('high', null, null),
      ]),
    ).toEqual([])
  })

  it('drops the silent lane and keeps the singing one', () => {
    const lines = buildPianoPreviewLines([
      laneFor('low', 48, 'C3'),
      laneFor('high', null, null),
    ])

    expect(lines).toHaveLength(1)
    expect(lines[0].laneId).toBe('low')
  })

  it('orders both lanes left to right by pitch', () => {
    /* Passed high-first to prove the sort, not the input order. */
    const lines = buildPianoPreviewLines([
      laneFor('high', 72, 'C5'),
      laneFor('low', 48, 'C3'),
    ])

    expect(lines.map((line) => line.laneId)).toEqual(['low', 'high'])
    expect(lines[0].x).toBeLessThan(lines[1].x)
  })

  it('keeps both chips on the first row when they are far apart', () => {
    const lines = buildPianoPreviewLines([
      laneFor('low', 48, 'C3'),
      laneFor('high', 72, 'C5'),
    ])

    expect(lines.every((line) => line.labelRow === 0)).toBe(true)
  })

  it('stacks the second chip when the two lines nearly coincide', () => {
    /* A semitone apart at the default unit is well under the collision width,
     * so the labels would otherwise overlap. */
    const lines = buildPianoPreviewLines([
      laneFor('low', 60, 'C4'),
      laneFor('high', 61, 'C♯4'),
    ])

    expect(lines[1].x - lines[0].x).toBeLessThan(PREVIEW_LABEL_COLLISION_PX)
    expect(lines.map((line) => line.labelRow)).toEqual([0, 1])
  })

  /*
   * The chip slides in off its line near the ends of the keyboard, so an
   * out-of-range voice — whose line pins to the very edge — does not hang half a
   * chip past the last key. The expected offsets are half an estimated chip
   * (4px + 7.5px per character); see estimateLabelWidth.
   */
  describe('chip clamping', () => {
    it('leaves the chip on its line in the middle of the keyboard', () => {
      const [line] = buildPianoPreviewLines([laneFor('low', 60, 'C4')])

      expect(line.labelX).toBe(line.x)
    })

    it('slides the chip in where the line pins to the top end', () => {
      const [line] = buildPianoPreviewLines([laneFor('low', 97, 'C♯7')])

      expect(line.x).toBeCloseTo(layout.totalWidth)
      // Half a 3-character chip clear of the end: (4 + 3 × 7.5) / 2
      expect(layout.totalWidth - line.labelX).toBeCloseTo(13.25)
    })

    it('slides the chip in where the line pins to the bottom end', () => {
      const [line] = buildPianoPreviewLines([laneFor('low', 35, 'B1')])

      expect(line.x).toBe(0)
      // Half a 2-character chip: (4 + 2 × 7.5) / 2
      expect(line.labelX).toBeCloseTo(9.5)
    })

    it('slides a chip carrying cents further in than a bare one', () => {
      const detuned = midiToFrequency(97) * Math.pow(2, 45 / 1200)
      const [line] = buildPianoPreviewLines([
        { ...laneFor('low', 97, 'C♯7'), previewFrequency: detuned },
      ])

      expect(line.text).toBe('C♯7 +45¢')
      // Half an 8-character chip: (4 + 8 × 7.5) / 2
      expect(layout.totalWidth - line.labelX).toBeCloseTo(32)
    })
  })
})
