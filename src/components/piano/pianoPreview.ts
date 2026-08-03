import { formatNoteLabelWithCents, frequencyToMidi } from '@/utils/noteUtils'
import { type PianoLayout, pianoPitchXForMidi } from './pianoLayout'

/* ¢ — matches the pitch-detector preview indicator's cents threshold. */
export const PREVIEW_CENTS_THRESHOLD = 20
/* Semitones — hide the line once more than ±1 octave outside the range
 * (pitch-detector parity). */
export const PREVIEW_RANGE_TOLERANCE = 12

export type PianoPreviewLine = { x: number; text: string }

type PianoPreviewInput = {
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
