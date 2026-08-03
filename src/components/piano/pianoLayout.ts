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

export type PianoKey = {
  midi: number
  /* Linear pitch position of the note's center on the x-axis (px). */
  pitchX: number
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
    label: null,
    isBlack: true,
    leftPx: pitchX(midi) - blackWidth / 2,
    widthPx: blackWidth,
  }))

  return { whites, blacks, totalWidth }
}
