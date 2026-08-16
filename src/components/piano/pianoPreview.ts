import type { AccidentalStyle } from '@/composables/accidentalStyle'
import {
  formatNoteLabelWithCents,
  frequencyToMidi,
  midiToNoteLabel,
} from '@/utils/noteUtils'
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
  /* Where the chip's centre goes, which is `x` everywhere except near the ends
   * of the keyboard — see the clamp in buildPianoPreviewLines. */
  labelX: number
  /* 0 or 1 — which of the two stacked chip rows this label occupies. */
  labelRow: number
}

/* px — chips closer together than this would overlap, so the later one drops to
 * the row below. Roughly the width of a "C♯4 +12¢" chip. */
export const PREVIEW_LABEL_COLLISION_PX = 56

/*
 * Chip width, estimated from the text rather than measured. Measured in the
 * browser at the chip's own styling (text-xs, semibold, tabular-nums, px-0.5):
 * "C4" 20.7px, "C♯4" 26.9px, "C♯4 +12¢" 61.7px — a straight line through those
 * points, erring high on the long labels, which is the safe direction.
 *
 * An estimate rather than a measurement because the only thing it feeds is the
 * clamp below: a px either way moves the chip a px. Measuring the real element
 * would mean observing it and re-running on every text change, which is every
 * time the cents digits move — constantly, while somebody is singing.
 */
const PREVIEW_LABEL_CHAR_PX = 7.5
const PREVIEW_LABEL_PADDING_PX = 4

function estimateLabelWidth(text: string): number {
  return PREVIEW_LABEL_PADDING_PX + text.length * PREVIEW_LABEL_CHAR_PX
}

/*
 * px — blank strip the display keeps at each end of the keyboard, outside the
 * keys. Just for the line: it is 3px wide and drawn centred on its x, so where
 * it pins to an edge half of it would fall outside the keys. The chip needs no
 * strip of its own — it moves instead (see the clamp in buildPianoPreviewLines).
 *
 * Anything hanging past the end widens the scroll box's content, so without this
 * a horizontal scrollbar blinks in and out as the singer crosses the edge of the
 * range (and at the low end the overhang is simply clipped, since a scroll box
 * cannot scroll to inline-start overflow).
 */
export const PREVIEW_EDGE_GUTTER_PX = 4

export type PianoPreviewInput = {
  previewMidi: number | null
  previewFrequency: number | null
  previewNoteLabel: string | null
  layout: PianoLayout
  /* Which spelling leads on the keys, so the chip can agree with them. Optional
   * so a caller that has no style to hand keeps the app's default spelling. */
  accidentalStyle?: AccidentalStyle
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
  const {
    previewMidi,
    previewFrequency,
    previewNoteLabel,
    layout,
    accidentalStyle = 'sharp',
  } = input
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

  /* The chip has to agree with the keys underneath it, so it follows the
   * keyboard's leading spelling. Only the flat side re-derives: sharp mode
   * passes the detector's own label straight through, leaving the common path
   * exactly as it was. Safe to re-derive at all because previewMidi and
   * previewNoteLabel come from the same NoteInfo (see useIdlePreview), so the
   * two can never disagree. */
  const noteLabel =
    accidentalStyle === 'flat'
      ? midiToNoteLabel(previewMidi, { showOctave: true, preferFlats: true })
          .label
      : previewNoteLabel

  const text = formatNoteLabelWithCents(
    noteLabel,
    cents,
    PREVIEW_CENTS_THRESHOLD,
  )

  return { x, text }
}

/*
 * Chip centre for a line at x, kept inside the keyboard.
 *
 * A voice outside the range pins its line to the keyboard edge, and a chip
 * centred there would hang half its width past the last key. The line stays put
 * — it is the pitch — and the chip slides in until it fits, so at the top of the
 * keyboard it ends up sitting just inside the line rather than astride it. The
 * clamp is continuous, so an approaching chip slides rather than snaps.
 *
 * Falls back to the keyboard's midpoint if a chip is wider than the whole
 * keyboard, which takes a range of a few semitones on a phone.
 */
function clampLabelX(x: number, text: string, totalWidth: number): number {
  const half = estimateLabelWidth(text) / 2
  if (half * 2 > totalWidth) return totalWidth / 2

  return Math.min(Math.max(x, half), totalWidth - half)
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
      if (!line) return null

      return {
        ...line,
        laneId: input.laneId,
        labelX: clampLabelX(line.x, line.text, input.layout.totalWidth),
        labelRow: 0,
      }
    })
    .filter((line): line is PianoPreviewLineView => line !== null)
    .sort((a, b) => a.x - b.x)

  /* On labelX, not x: the chips are what overlap, and near the ends of the
   * keyboard they no longer sit on their lines. Clamping is monotonic in x, so
   * the left-to-right sort above still holds for them. */
  for (let index = 1; index < lines.length; index++) {
    const previous = lines[index - 1]
    if (lines[index].labelX - previous.labelX < PREVIEW_LABEL_COLLISION_PX) {
      /* Alternate rather than always using row 1, so three-plus lines keep
       * stepping instead of piling onto the same second row. */
      lines[index].labelRow = previous.labelRow === 0 ? 1 : 0
    }
  }

  return lines
}
