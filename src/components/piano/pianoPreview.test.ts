import { describe, expect, it } from 'vitest'
import { midiToFrequency } from '@/utils/noteUtils'
import { buildPianoLayout } from './pianoLayout'
import { buildPianoPreviewLine } from './pianoPreview'

const FULL = { midiMin: 36, midiMax: 96 } // C2–C7
const layout = buildPianoLayout(FULL.midiMin, FULL.midiMax)

/* Shared axis params + range for every case; each test overrides the pitch. */
function lineFor(overrides: {
  previewMidi: number | null
  previewFrequency: number | null
  previewNoteLabel: string | null
}) {
  return buildPianoPreviewLine({
    ...overrides,
    midiMin: FULL.midiMin,
    midiMax: FULL.midiMax,
    originPitch: layout.originPitch,
    unit: layout.unit,
    totalWidth: layout.totalWidth,
  })
}

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
    // C7 is 96; 96 + 13 = 109 is beyond midiMax + 12
    expect(
      lineFor({
        previewMidi: 109,
        previewFrequency: midiToFrequency(109),
        previewNoteLabel: 'C♯8',
      }),
    ).toBeNull()
  })

  it('places an exact note at that key’s pitchX, with no cents suffix', () => {
    const line = lineFor({
      previewMidi: 60,
      previewFrequency: midiToFrequency(60), // exactly C4
      previewNoteLabel: 'C4',
    })
    const c4 = layout.whites.find((key) => key.midi === 60)!
    expect(line).not.toBeNull()
    expect(line!.x).toBeCloseTo(c4.pitchX)
    expect(line!.text).toBe('C4')
  })

  it('appends a signed cents suffix once past the 20¢ threshold', () => {
    // +35¢ above C4
    const sharp = midiToFrequency(60) * Math.pow(2, 35 / 1200)
    const line = lineFor({
      previewMidi: 60,
      previewFrequency: sharp,
      previewNoteLabel: 'C4',
    })
    expect(line!.text).toMatch(/C4 \+\d+¢/)

    // +10¢ is within threshold → bare label
    const nearlyClean = midiToFrequency(60) * Math.pow(2, 10 / 1200)
    expect(
      lineFor({
        previewMidi: 60,
        previewFrequency: nearlyClean,
        previewNoteLabel: 'C4',
      })!.text,
    ).toBe('C4')
  })

  it('clamps x to the keyboard edges for in-tolerance out-of-range pitches', () => {
    // A semitone below C2 (still within the 12-semitone tolerance) → clamp to 0
    const below = lineFor({
      previewMidi: 35,
      previewFrequency: midiToFrequency(35),
      previewNoteLabel: 'B1',
    })
    expect(below!.x).toBe(0)

    // Above C7 → clamp to totalWidth
    const above = lineFor({
      previewMidi: 98,
      previewFrequency: midiToFrequency(98),
      previewNoteLabel: 'D7',
    })
    expect(above!.x).toBe(layout.totalWidth)
  })
})
