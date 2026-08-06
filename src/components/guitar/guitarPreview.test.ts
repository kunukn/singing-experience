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
      buildGuitarPreviewLane({
        laneId: 'low',
        previewMidi: null,
        previewFrequency: null,
        previewNoteLabel: null,
      }),
    ).toBeNull()
  })

  it('marks every string that can reach the pitch', () => {
    const lane = buildGuitarPreviewLane(laneAt(C3_MIDI, 'C3'))

    /* C3 is reachable only from the two lowest strings within 15 frets. */
    expect(lane?.segments).toEqual([
      { stringIndex: STRING_6, y: guitarFretY(8) },
      { stringIndex: STRING_5, y: guitarFretY(3) },
    ])
  })

  it('puts an open-string pitch on the open row', () => {
    const lane = buildGuitarPreviewLane(laneAt(E2_MIDI, 'E2'))

    expect(lane?.segments).toEqual([
      { stringIndex: STRING_6, y: guitarFretY(0) },
    ])
  })

  it('keeps the chip when no string can reach the pitch', () => {
    /* Two semitones below the open low E — still worth naming, but there is
     * nowhere on the board to draw it. Clamping to fret 0 instead would read as
     * an in-tune open E. */
    const lane = buildGuitarPreviewLane(laneAt(E2_MIDI - 2, 'D2'))

    expect(lane?.text).toBe('D2')
    expect(lane?.segments).toEqual([])
  })

  it('stops drawing more than an octave outside the board', () => {
    expect(buildGuitarPreviewLane(laneAt(E2_MIDI - 13, 'D♯1'))).toBeNull()
  })

  it('moves every segment down as the pitch rises', () => {
    const lower = buildGuitarPreviewLane(laneAt(C3_MIDI, 'C3'))
    const higher = buildGuitarPreviewLane(laneAt(C3_MIDI + 1, 'C♯3'))

    expect(higher?.segments).toHaveLength(lower?.segments.length ?? 0)
    higher?.segments.forEach((segment, index) => {
      expect(segment.y - (lower?.segments[index].y ?? 0)).toBeCloseTo(
        FRET_ROW_HEIGHT,
      )
    })
  })

  it('follows the pitch continuously between frets', () => {
    const halfway = buildGuitarPreviewLane(laneAt(C3_MIDI, 'C3', 50))

    /* Half a semitone sharp sits half a row below C3's own row centre. */
    expect(halfway?.segments[0].y).toBeCloseTo(guitarFretY(8.5))
  })

  it('appends a cents suffix once past the threshold', () => {
    expect(buildGuitarPreviewLane(laneAt(C3_MIDI, 'C3', 5))?.text).toBe('C3')
    expect(buildGuitarPreviewLane(laneAt(C3_MIDI, 'C3', 40))?.text).toBe(
      'C3 +40¢',
    )
  })
})

describe('buildGuitarPreviewLanes', () => {
  it('keeps both duet lanes and drops the silent one', () => {
    const lanes = buildGuitarPreviewLanes([
      laneAt(C3_MIDI, 'C3'),
      {
        laneId: 'high',
        previewMidi: null,
        previewFrequency: null,
        previewNoteLabel: null,
      },
    ])

    expect(lanes).toHaveLength(1)
    expect(lanes[0].laneId).toBe('low')
  })
})
