import type { ClefKey } from '@/components/notes/notesConstants'

/* Staff position of each pitch class in half-line steps above C (C=0, D=1 … B=6).
 * A sharp sits halfway to the next letter, so a continuous (fractional) pitch
 * glides smoothly instead of jumping when it crosses a black key. */
const STEP_IN_OCTAVE = [0, 0.5, 1, 1.5, 2, 3, 3.5, 4, 4.5, 5, 5.5, 6]

/* Pitch on each clef's top staff line: F5 (treble), A3 (bass). */
const TOP_LINE_MIDI: Record<ClefKey, number> = { treble: 77, bass: 57 }

function semitoneStep(midi: number): number {
  const pitchClass = ((midi % 12) + 12) % 12

  return Math.floor(midi / 12) * 7 + STEP_IN_OCTAVE[pitchClass]
}

/* Diatonic staff step (one step = line to adjacent space) for a fractional MIDI
 * pitch, interpolated between the two neighbouring semitones. */
export function midiToStaffStep(midi: number): number {
  const lower = Math.floor(midi)
  const fraction = midi - lower

  return (
    semitoneStep(lower) +
    (semitoneStep(lower + 1) - semitoneStep(lower)) * fraction
  )
}

/* Y of a pitch given where the clef's top staff line is drawn and the distance
 * between two staff lines. Unlike a fit to noteheads, this needs no notes on
 * the sheet, so the line also works on an empty staff. */
export function staffPitchY(
  midi: number,
  clef: ClefKey,
  topLineY: number,
  lineSpacing: number,
): number {
  const stepsAboveTop =
    midiToStaffStep(midi) - midiToStaffStep(TOP_LINE_MIDI[clef])

  return topLineY - (stepsAboveTop * lineSpacing) / 2
}
