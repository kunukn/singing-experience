import {
  PREVIEW_CENTS_THRESHOLD,
  PREVIEW_RANGE_TOLERANCE,
} from '@/components/piano/pianoPreview'
import { formatNoteLabelWithCents, frequencyToMidi } from '@/utils/noteUtils'
import {
  GUITAR_MAX_FRET,
  GUITAR_MIDI_MAX,
  GUITAR_MIDI_MIN,
  GUITAR_STANDARD_TUNING,
  guitarFretY,
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
): GuitarPreviewLaneView | null {
  const { previewMidi, previewFrequency, previewNoteLabel, laneId } = input
  if (previewMidi === null || previewNoteLabel === null) return null

  /* Beyond an octave outside the board, stop drawing entirely (piano parity). */
  if (
    previewMidi < GUITAR_MIDI_MIN - PREVIEW_RANGE_TOLERANCE ||
    previewMidi > GUITAR_MIDI_MAX + PREVIEW_RANGE_TOLERANCE
  )
    return null

  const floatMidi =
    previewFrequency !== null ? frequencyToMidi(previewFrequency) : previewMidi

  const segments: GuitarPreviewSegment[] = []
  GUITAR_STANDARD_TUNING.forEach((openMidi, stringIndex) => {
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

  return {
    laneId,
    text: formatNoteLabelWithCents(
      previewNoteLabel,
      cents,
      PREVIEW_CENTS_THRESHOLD,
    ),
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
): GuitarPreviewLaneView[] {
  return inputs
    .map(buildGuitarPreviewLane)
    .filter((lane): lane is GuitarPreviewLaneView => lane !== null)
}
