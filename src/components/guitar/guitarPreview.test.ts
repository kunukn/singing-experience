import { GUITAR_TUNINGS } from '@/utils/guitarTunings'
import { midiToFrequency } from '@/utils/noteUtils'
import { describe, expect, it } from 'vitest'
import { FRET_ROW_HEIGHT, guitarFretY } from './guitarLayout'
import {
  buildGuitarPreviewLane,
  buildGuitarPreviewLanes,
} from './guitarPreview'

const STRING_6 = 0
const STRING_5 = 1

const C3_MIDI = 48
const E2_MIDI = 40

const STANDARD = GUITAR_TUNINGS.standard.midi
const DROP_D = GUITAR_TUNINGS.dropD.midi

/* A pitch detected dead on the note, the common case. */
function laneAt(midi: number, label: string, centsOff = 0) {
  return {
    laneId: 'low' as const,
    previewMidi: midi,
    previewFrequency: midiToFrequency(midi + centsOff / 100),
    previewNoteLabel: label,
  }
}

describe('buildGuitarPreviewLane', () => {
  it('drops the lane when nobody is singing', () => {
    expect(
      buildGuitarPreviewLane(
        {
          laneId: 'low',
          previewMidi: null,
          previewFrequency: null,
          previewNoteLabel: null,
        },
        STANDARD,
      ),
    ).toBeNull()
  })

  it('marks every string that can reach the pitch', () => {
    const lane = buildGuitarPreviewLane(laneAt(C3_MIDI, 'C3'), STANDARD)

    /* C3 is reachable only from the two lowest strings within 15 frets. */
    expect(lane?.segments).toEqual([
      { stringIndex: STRING_6, y: guitarFretY(8) },
      { stringIndex: STRING_5, y: guitarFretY(3) },
    ])
  })

  it('puts an open-string pitch on the open row', () => {
    const lane = buildGuitarPreviewLane(laneAt(E2_MIDI, 'E2'), STANDARD)

    expect(lane?.segments).toEqual([
      { stringIndex: STRING_6, y: guitarFretY(0) },
    ])
  })

  it('keeps the chip when no string can reach the pitch', () => {
    /* Two semitones below the open low E — still worth naming, but there is
     * nowhere on the board to draw it. Clamping to fret 0 instead would read as
     * an in-tune open E. */
    const lane = buildGuitarPreviewLane(laneAt(E2_MIDI - 2, 'D2'), STANDARD)

    expect(lane?.text).toBe('D2')
    expect(lane?.segments).toEqual([])
  })

  it('draws on the retuned positions, not the standard ones', () => {
    /* In Drop D the open low string is D2, so E2 is no longer an open note there
     * — it moves to fret 2, and a pitch that was off the board entirely (D2) now
     * lands on the open row. */
    const openE = buildGuitarPreviewLane(laneAt(E2_MIDI, 'E2'), DROP_D)
    expect(openE?.segments).toEqual([
      { stringIndex: STRING_6, y: guitarFretY(2) },
    ])

    const openD = buildGuitarPreviewLane(laneAt(E2_MIDI - 2, 'D2'), DROP_D)
    expect(openD?.segments).toEqual([
      { stringIndex: STRING_6, y: guitarFretY(0) },
    ])
  })

  it('stops drawing more than an octave outside the board', () => {
    expect(
      buildGuitarPreviewLane(laneAt(E2_MIDI - 13, 'D♯1'), STANDARD),
    ).toBeNull()
  })

  it('moves every segment down as the pitch rises', () => {
    const lower = buildGuitarPreviewLane(laneAt(C3_MIDI, 'C3'), STANDARD)
    const higher = buildGuitarPreviewLane(laneAt(C3_MIDI + 1, 'C♯3'), STANDARD)

    expect(higher?.segments).toHaveLength(lower?.segments.length ?? 0)
    higher?.segments.forEach((segment, index) => {
      expect(segment.y - (lower?.segments[index].y ?? 0)).toBeCloseTo(
        FRET_ROW_HEIGHT,
      )
    })
  })

  it('follows the pitch continuously between frets', () => {
    const halfway = buildGuitarPreviewLane(laneAt(C3_MIDI, 'C3', 50), STANDARD)

    /* Half a semitone sharp sits half a row below C3's own row centre. */
    expect(halfway?.segments[0].y).toBeCloseTo(guitarFretY(8.5))
  })

  it('appends a cents suffix once past the threshold', () => {
    expect(
      buildGuitarPreviewLane(laneAt(C3_MIDI, 'C3', 5), STANDARD)?.text,
    ).toBe('C3')
    expect(
      buildGuitarPreviewLane(laneAt(C3_MIDI, 'C3', 40), STANDARD)?.text,
    ).toBe('C3 +40¢')
  })
})

describe('buildGuitarPreviewLanes', () => {
  it('keeps both duet lanes and drops the silent one', () => {
    const lanes = buildGuitarPreviewLanes(
      [
        laneAt(C3_MIDI, 'C3'),
        {
          laneId: 'high',
          previewMidi: null,
          previewFrequency: null,
          previewNoteLabel: null,
        },
      ],
      STANDARD,
    )

    expect(lanes).toHaveLength(1)
    expect(lanes[0].laneId).toBe('low')
  })
})

describe('accidental spelling', () => {
  const A_SHARP_2_MIDI = 46

  it('leaves the chip label exactly as the detector spelled it', () => {
    /* Sharp mode passes previewNoteLabel straight through — no re-derivation, so
     * nothing about the existing behaviour can drift. */
    const lane = buildGuitarPreviewLane(
      laneAt(A_SHARP_2_MIDI, 'A♯2'),
      STANDARD,
      'sharp',
    )

    expect(lane?.text).toBe('A♯2')
  })

  it('respells the chip to match a flat board', () => {
    const lane = buildGuitarPreviewLane(
      laneAt(A_SHARP_2_MIDI, 'A♯2'),
      STANDARD,
      'flat',
    )

    expect(lane?.text).toBe('B♭2')
  })

  it('keeps the cents suffix when respelling', () => {
    const lane = buildGuitarPreviewLane(
      laneAt(A_SHARP_2_MIDI, 'A♯2', 40),
      STANDARD,
      'flat',
    )

    expect(lane?.text).toBe('B♭2 +40¢')
  })
})
