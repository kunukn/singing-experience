import { describe, expect, it } from 'vitest'
import { midiToFrequency } from '@/utils/noteUtils'
import { buildPianoLayout } from './pianoLayout'
import { buildPianoPreviewLine } from './pianoPreview'

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
