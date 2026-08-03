import { formatNoteLabelWithCents, frequencyToMidi } from '@/utils/noteUtils'

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
  midiMin: number
  midiMax: number
  originPitch: number
  unit: number
  totalWidth: number
}

/*
 * Map the live detected pitch onto the keyboard's linear x-axis.
 *
 * Returns null when there's no clean pitch, or when the note is more than an
 * octave outside the selected range. Otherwise the x follows the CONTINUOUS
 * pitch (interpolated between keys), clamped to the keyboard edges, and the text
 * is the nearest-note label plus a signed cents suffix once past the threshold.
 */
export function buildPianoPreviewLine(
  input: PianoPreviewInput,
): PianoPreviewLine | null {
  const { previewMidi, previewFrequency, previewNoteLabel } = input
  if (previewMidi === null || previewNoteLabel === null) return null

  if (
    previewMidi < input.midiMin - PREVIEW_RANGE_TOLERANCE ||
    previewMidi > input.midiMax + PREVIEW_RANGE_TOLERANCE
  )
    return null

  const floatMidi =
    previewFrequency !== null ? frequencyToMidi(previewFrequency) : previewMidi
  const rawX = (floatMidi - input.originPitch) * input.unit
  const x = Math.max(0, Math.min(input.totalWidth, rawX)) // clamp to keyboard edges

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
