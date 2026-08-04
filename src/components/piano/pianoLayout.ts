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
 *
 * Those rectangles are ASYMMETRIC around the pitch for C/E/F/B — 1 semitone to
 * one neighbouring natural, 2 to the other — so everything pitch-related (the
 * hint line, the label, the live-pitch overlay) sits on `pitchX`, never on the
 * rectangle center. That is what keeps consecutive hint lines exactly one unit
 * apart; rectangle centers would alternate between 0.75 and 1.5 units (e.g.
 * D♯→E 18px but E→F 36px at a 24px unit). The price is a line drawn a quarter
 * unit off-center on C/E/F/B.
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

/* Fractional pitch positions of a white key's rectangle edges — the midpoints
 * to its neighboring naturals (inside or just outside the range). */
const leftBoundary = (midi: number) => (midi + previousNatural(midi)) / 2
const rightBoundary = (midi: number) => (midi + nextNatural(midi)) / 2

export const SEMITONE_UNIT = 24 // px per semitone — the linear pitch-axis scale
export const WHITE_KEY_HEIGHT = 160 // px
export const BLACK_KEY_HEIGHT_RATIO = 0.62 // of the white key height
export const BLACK_KEY_WIDTH_RATIO = 0.62 // of a full (2-unit) white key
export const PIANO_LABEL_BAND_HEIGHT = 28 // px — headroom above the keys for the live-pitch chip
/* px — key-free strip under the keys, grabbed to pan a keyboard wider than the
 * screen without sounding a note. 44 = Apple HIG minimum tap target (same
 * reasoning as MIN_SEMITONE_UNIT_TOUCH below). */
export const PIANO_DRAG_GUTTER_HEIGHT = 44

/*
 * Bounds for the fit-to-container unit (see PianoDisplay). On touch, 36 makes a
 * black key 2 × 36 × 0.62 = 44.6px wide — Apple HIG's 44pt minimum tap target,
 * which the default 24 (29.8px) misses. Mouse/trackpad keeps 24 so the widest
 * range still fits a desktop container without scrolling.
 */
export const MIN_SEMITONE_UNIT_TOUCH = 36
export const MIN_SEMITONE_UNIT_POINTER = SEMITONE_UNIT
/* A 2-unit white key at 48 is 96px — about life-size (a real white key is
 * 23.5mm). Beyond that a narrow range looks like a toy on a wide screen. */
export const MAX_SEMITONE_UNIT = 48

export type PianoKey = {
  midi: number
  /* Linear pitch position of the note on the x-axis (px) — where the hint line,
   * the label and the live-pitch line sit. For C/E/F/B this is a quarter unit
   * off the rectangle center; every other key it coincides. */
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
  /* Lowest and highest semitone drawn — the clamp bounds for the pitch axis. */
  midiMin: number
  midiMax: number
  /* The pitch axis itself: x = (midi - originPitch) * unit. originPitch is the
   * fractional midi at x = 0 (the leftmost key's outer edge). */
  originPitch: number
  unit: number
}

/*
 * Voice→x map. Exactly linear because the axis is linear in semitones, so a
 * cent is worth the same px anywhere on the keyboard and an exact note lands on
 * its key's hint line. Clamped to the keyboard's midi range.
 */
export function pianoPitchXForMidi(layout: PianoLayout, midi: number): number {
  const clamped = Math.max(layout.midiMin, Math.min(layout.midiMax, midi))

  return (clamped - layout.originPitch) * layout.unit
}

/*
 * Keyboard width in semitone units — the leftmost white key's outer edge to the
 * rightmost's. `totalWidth === pianoSpanUnits(midiMin, midiMax) * unit`, so a
 * caller can solve for the unit that fits a given pixel width before building
 * the layout.
 */
export function pianoSpanUnits(midiMin: number, midiMax: number): number {
  const firstWhite = isNaturalMidi(midiMin) ? midiMin : nextNatural(midiMin)
  const lastWhite = isNaturalMidi(midiMax) ? midiMax : previousNatural(midiMax)

  return rightBoundary(lastWhite) - leftBoundary(firstWhite)
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

  return { whites, blacks, totalWidth, midiMin, midiMax, originPitch, unit }
}
