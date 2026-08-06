import {
  PREVIEW_CENTS_THRESHOLD,
  PREVIEW_RANGE_TOLERANCE,
} from '@/components/piano/pianoPreview'
import {
  formatNoteLabelWithCents,
  frequencyToMidi,
  midiToNoteLabel,
} from '@/utils/noteUtils'
import type { AccidentalStyle } from './guitarAccidentals'
import {
  GUITAR_MAX_FRET,
  guitarFretY,
  guitarMidiMax,
  guitarMidiMin,
} from './guitarLayout'

/*
 * Which singer a live-pitch lane belongs to: 'low' is the single voice in
 * normal mode and the lower band in duet mode, 'high' the second singer.
 * Mirrors the piano's lane ids — the geometry differs per instrument, the lane
 * identity does not.
 */
export type GuitarPreviewLaneId = 'low' | 'high'

/* One string's take on the sung pitch: its column, and how far down the board
 * that pitch falls on it. */
export type GuitarPreviewSegment = { stringIndex: number; y: number }

export type GuitarPreviewLaneView = {
  laneId: GuitarPreviewLaneId
  /* Nearest-note label plus a signed cents suffix once past the threshold. */
  text: string
  /* Empty when the pitch is on no string's 0–15 window — the chip still shows. */
  segments: GuitarPreviewSegment[]
}

export type GuitarPreviewInput = {
  previewMidi: number | null
  previewFrequency: number | null
  previewNoteLabel: string | null
}

/*
 * Half a row of overhang, so a pitch sitting exactly on the nut or on the last
 * fret wire still draws rather than blinking out at the boundary.
 */
const FRET_POSITION_OVERHANG = 0.5

/*
 * Map one live pitch onto every string that can reach it.
 *
 * Unlike the piano there is NO edge clamping. Pinning a too-low pitch to fret 0
 * would land it on the open note of all six strings at once, reading as six
 * simultaneously in-tune notes. A string that cannot reach the pitch simply
 * contributes no segment; when none can, the lane still returns its chip so the
 * fixed label band keeps naming what the singer is doing.
 */
export function buildGuitarPreviewLane(
  input: GuitarPreviewInput & { laneId: GuitarPreviewLaneId },
  tuning: readonly number[],
  accidentalStyle: AccidentalStyle = 'sharp',
): GuitarPreviewLaneView | null {
  const { previewMidi, previewFrequency, previewNoteLabel, laneId } = input
  if (previewMidi === null || previewNoteLabel === null) return null

  /* Beyond an octave outside the board, stop drawing entirely (piano parity). */
  if (
    previewMidi < guitarMidiMin(tuning) - PREVIEW_RANGE_TOLERANCE ||
    previewMidi > guitarMidiMax(tuning) + PREVIEW_RANGE_TOLERANCE
  )
    return null

  const floatMidi =
    previewFrequency !== null ? frequencyToMidi(previewFrequency) : previewMidi

  const segments: GuitarPreviewSegment[] = []
  tuning.forEach((openMidi, stringIndex) => {
    const fretPosition = floatMidi - openMidi
    if (
      fretPosition < -FRET_POSITION_OVERHANG ||
      fretPosition > GUITAR_MAX_FRET + FRET_POSITION_OVERHANG
    )
      return

    segments.push({ stringIndex, y: guitarFretY(fretPosition) })
  })

  /* Cents relative to the snapped note, matching the pitch-detector indicator
   * (round(100 × (continuous − nearest))). */
  const cents = Math.round(100 * (floatMidi - previewMidi))

  /* The chip has to agree with the cells underneath it, so it follows the board's
   * spelling. Only the flat side re-derives: sharp mode passes the detector's own
   * label straight through, leaving the common path exactly as it was. Safe to
   * re-derive at all because previewMidi and previewNoteLabel come from the same
   * NoteInfo (see useIdlePreview), so the two can never disagree. */
  const noteLabel =
    accidentalStyle === 'flat'
      ? midiToNoteLabel(previewMidi, { showOctave: true, preferFlats: true })
          .label
      : previewNoteLabel

  return {
    laneId,
    text: formatNoteLabelWithCents(noteLabel, cents, PREVIEW_CENTS_THRESHOLD),
    segments,
  }
}

/*
 * Map one or two live lanes onto the board at once. Lanes with no clean pitch
 * drop out, so this is empty while nobody is singing.
 *
 * No chip-collision handling, unlike the piano: the chips live in a fixed band
 * above the board rather than riding their lines, so they cannot overlap.
 */
export function buildGuitarPreviewLanes(
  inputs: Array<GuitarPreviewInput & { laneId: GuitarPreviewLaneId }>,
  tuning: readonly number[],
  accidentalStyle: AccidentalStyle = 'sharp',
): GuitarPreviewLaneView[] {
  /* Explicit arrow, not a bare reference: map would pass the index as the
   * tuning. */
  return inputs
    .map((input) => buildGuitarPreviewLane(input, tuning, accidentalStyle))
    .filter((lane): lane is GuitarPreviewLaneView => lane !== null)
}
