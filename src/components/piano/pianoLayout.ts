import { isNaturalMidi } from '@/components/notes/notesScales'
import { midiToNoteLabel } from '@/utils/noteUtils'

/*
 * Piano keyboard geometry with a LINEAR semitone x-axis.
 *
 * The horizontal position of a note is `pitchX = (midi - midiMin) * unit`, so
 * every semitone step is the same pixel distance. This is the core invariant:
 * a future voice-pitch overlay maps onto the keyboard with a straight line, and
 * B3→C4 spans exactly the same px as C4→C#4.
 *
 * White keys tile contiguously (full height); black keys are drawn on top,
 * centered on their semitone position (raised, ~62% height). Because the white
 * keys E/F and B/C sit on a 1-semitone boundary (no black key between) while
 * every other white-key pair is 2 semitones apart, the contiguous tiling makes
 * E/F/B/C 1.5 units wide and the rest 2 units — the only widths that keep the
 * semitone spacing even.
 *
 * A white key's rectangle spans from the midpoint to the natural note below it
 * to the midpoint to the natural note above it. The first and last keys use the
 * natural just OUTSIDE the range as that neighbor, so they get their full width
 * too — every C is the same width, with no truncated end keys.
 */

/* Nearest natural (white-key) note strictly below / above a given midi. */
function previousNatural(midi: number): number {
  let candidate = midi - 1
  while (!isNaturalMidi(candidate)) candidate--

  return candidate
}

function nextNatural(midi: number): number {
  let candidate = midi + 1
  while (!isNaturalMidi(candidate)) candidate++

  return candidate
}

export const SEMITONE_UNIT = 24 // px per semitone — the linear pitch-axis scale
export const WHITE_KEY_HEIGHT = 160 // px
export const BLACK_KEY_HEIGHT_RATIO = 0.62 // of the white key height
export const BLACK_KEY_WIDTH_RATIO = 0.62 // of a full (2-unit) white key
export const PIANO_LABEL_BAND_HEIGHT = 28 // px — headroom above the keys for the live-pitch chip

export type PianoKey = {
  midi: number
  /* Linear pitch position of the note on the x-axis (px). Used to place keys;
   * for asymmetric white keys this differs from the rectangle center. */
  pitchX: number
  /* Dead-center of the key's rectangle (px) — where the live-pitch line and the
   * grey hint line sit. For black keys this equals pitchX. */
  centerX: number
  /* Non-null only for C keys (octave markers), e.g. "C4". */
  label: string | null
  isBlack: boolean
  leftPx: number
  widthPx: number
}

export type PianoLayout = {
  whites: PianoKey[]
  blacks: PianoKey[]
  totalWidth: number
  /* All keys' centers, sorted ascending by midi (consecutive semitones). Drives
   * the piecewise-linear voice→x mapping so an in-tune note lands dead-center. */
  centers: { midi: number; centerX: number }[]
}

/*
 * Piecewise-linear voice→x map: interpolates between key centers so an exact
 * note lands dead-center on its key. Clamped to the keyboard's midi range.
 */
export function pianoCenterXForMidi(layout: PianoLayout, midi: number): number {
  const { centers } = layout
  if (centers.length < 2) return centers[0]?.centerX ?? 0

  const lo = centers[0].midi
  const hi = centers[centers.length - 1].midi
  const clamped = Math.max(lo, Math.min(hi, midi))
  const index = Math.min(Math.floor(clamped) - lo, centers.length - 2)
  const a = centers[index]
  const b = centers[index + 1] // b.midi === a.midi + 1 (consecutive)

  return a.centerX + (b.centerX - a.centerX) * (clamped - a.midi)
}

export function buildPianoLayout(
  midiMin: number,
  midiMax: number,
  unit = SEMITONE_UNIT,
): PianoLayout {
  const whiteMidis: number[] = []
  const blackMidis: number[] = []
  for (let midi = midiMin; midi <= midiMax; midi++) {
    if (isNaturalMidi(midi)) whiteMidis.push(midi)
    else blackMidis.push(midi)
  }

  /* Fractional pitch positions of a white key's rectangle edges — the midpoints
   * to its neighboring naturals (inside or just outside the range). */
  const leftBoundary = (midi: number) => (midi + previousNatural(midi)) / 2
  const rightBoundary = (midi: number) => (midi + nextNatural(midi)) / 2

  /* Anchor the track's x-origin at the leftmost key's outer edge so leftPx
   * starts at 0. pitchX stays linear in semitones (equal px per semitone) — the
   * origin is just a constant offset, so B3→C4 still equals C4→C#4. */
  const originPitch = leftBoundary(whiteMidis[0])
  const pitchX = (midi: number) => (midi - originPitch) * unit
  const totalWidth =
    (rightBoundary(whiteMidis[whiteMidis.length - 1]) - originPitch) * unit

  const whites: PianoKey[] = whiteMidis.map((midi) => {
    const leftPx = (leftBoundary(midi) - originPitch) * unit
    const rightPx = (rightBoundary(midi) - originPitch) * unit

    return {
      midi,
      pitchX: pitchX(midi),
      centerX: (leftPx + rightPx) / 2,
      label: midi % 12 === 0 ? midiToNoteLabel(midi).label : null,
      isBlack: false,
      leftPx,
      widthPx: rightPx - leftPx,
    }
  })

  const blackWidth = 2 * unit * BLACK_KEY_WIDTH_RATIO
  const blacks: PianoKey[] = blackMidis.map((midi) => ({
    midi,
    pitchX: pitchX(midi),
    /* Black keys are already centered on their pitch position. */
    centerX: pitchX(midi),
    label: null,
    isBlack: true,
    leftPx: pitchX(midi) - blackWidth / 2,
    widthPx: blackWidth,
  }))

  const centers = [...whites, ...blacks]
    .map((key) => ({ midi: key.midi, centerX: key.centerX }))
    .sort((a, b) => a.midi - b.midi)

  return { whites, blacks, totalWidth, centers }
}
