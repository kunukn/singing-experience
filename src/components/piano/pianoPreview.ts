import { formatNoteLabelWithCents, frequencyToMidi } from '@/utils/noteUtils'
import { type PianoLayout, pianoPitchXForMidi } from './pianoLayout'

/* ¢ — matches the pitch-detector preview indicator's cents threshold. */
export const PREVIEW_CENTS_THRESHOLD = 20
/* Semitones — hide the line once more than ±1 octave outside the range
 * (pitch-detector parity). */
export const PREVIEW_RANGE_TOLERANCE = 12

export type PianoPreviewLine = { x: number; text: string }

/* Which band a line came from in duet mode. Single-voice preview uses 'low'. */
export type PianoPreviewLaneId = 'low' | 'high'

export type PianoPreviewLineView = PianoPreviewLine & {
  laneId: PianoPreviewLaneId
  /* 0 or 1 — which of the two stacked chip rows this label occupies. */
  labelRow: number
}

/* px — chips closer together than this would overlap, so the later one drops to
 * the row below. Roughly the width of a "C♯4 +12¢" chip. */
export const PREVIEW_LABEL_COLLISION_PX = 56

export type PianoPreviewInput = {
  previewMidi: number | null
  previewFrequency: number | null
  previewNoteLabel: string | null
  layout: PianoLayout
}

/*
 * Map the live detected pitch onto the keyboard.
 *
 * Returns null when there's no clean pitch, or when the note is more than an
 * octave outside the selected range. Otherwise x follows the CONTINUOUS pitch
 * along the keyboard's linear semitone axis (so an in-tune note lands on its
 * key's hint line), clamped to the keyboard edges. The text is the nearest-note
 * label plus a signed cents suffix once past the threshold.
 */
export function buildPianoPreviewLine(
  input: PianoPreviewInput,
): PianoPreviewLine | null {
  const { previewMidi, previewFrequency, previewNoteLabel, layout } = input
  if (previewMidi === null || previewNoteLabel === null) return null

  const { midiMin, midiMax } = layout
  if (
    previewMidi < midiMin - PREVIEW_RANGE_TOLERANCE ||
    previewMidi > midiMax + PREVIEW_RANGE_TOLERANCE
  )
    return null

  const floatMidi =
    previewFrequency !== null ? frequencyToMidi(previewFrequency) : previewMidi

  /* Out-of-range pitches pin to the keyboard edge (parity with DoReMiScale's edge
   * clamp): a too-low note sits at the far left, a too-high note at the far right —
   * never on the first/last key's hint line, which would read as in-tune. */
  let x: number
  if (previewMidi < midiMin) {
    x = 0
  } else if (previewMidi > midiMax) {
    x = layout.totalWidth
  } else {
    x = Math.max(
      0,
      Math.min(layout.totalWidth, pianoPitchXForMidi(layout, floatMidi)),
    )
  }

  /* Cents relative to the snapped note, matching the pitch-detector indicator
   * (round(100 × (continuous − nearest))). */
  const cents = Math.round(100 * (floatMidi - previewMidi))
  const text = formatNoteLabelWithCents(
    previewNoteLabel,
    cents,
    PREVIEW_CENTS_THRESHOLD,
  )

  return { x, text }
}

/*
 * Map one or two live lanes onto the keyboard at once.
 *
 * Lanes that have no clean pitch drop out, the rest are ordered left to right,
 * and any chip that would collide with the one before it is pushed to a second
 * label row — two singers close in pitch put their lines nearly on top of each
 * other, and overlapping chips are unreadable.
 */
export function buildPianoPreviewLines(
  inputs: Array<PianoPreviewInput & { laneId: PianoPreviewLaneId }>,
): PianoPreviewLineView[] {
  const lines = inputs
    .map((input) => {
      const line = buildPianoPreviewLine(input)

      return line ? { ...line, laneId: input.laneId, labelRow: 0 } : null
    })
    .filter((line): line is PianoPreviewLineView => line !== null)
    .sort((a, b) => a.x - b.x)

  for (let index = 1; index < lines.length; index++) {
    const previous = lines[index - 1]
    if (lines[index].x - previous.x < PREVIEW_LABEL_COLLISION_PX) {
      /* Alternate rather than always using row 1, so three-plus lines keep
       * stepping instead of piling onto the same second row. */
      lines[index].labelRow = previous.labelRow === 0 ? 1 : 0
    }
  }

  return lines
}
