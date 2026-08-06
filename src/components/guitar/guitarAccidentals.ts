/*
 * How the fretboard spells the five accidental pitch classes.
 *
 * A choice rather than a stacked pair, unlike the piano and the note sheets:
 * a 30px fret row that already holds a scale dot and a hover ring has no height
 * for a second line of type, so the singer picks the convention they read.
 */
export type AccidentalStyle = 'sharp' | 'flat'

const ACCIDENTAL_STYLES: readonly AccidentalStyle[] = ['sharp', 'flat']

export function isAccidentalStyle(value: unknown): value is AccidentalStyle {
  return ACCIDENTAL_STYLES.includes(value as AccidentalStyle)
}

/* Labelled with real note names rather than bare ♯/♭ glyphs: it shows the user
 * exactly what will appear on the board, and matches the tone-label button
 * beside it, whose 'C'/'C4' options are also untranslated musical literals. */
export const ACCIDENTAL_STYLE_OPTIONS: Array<{
  label: string
  value: AccidentalStyle
}> = [
  { label: 'C♯', value: 'sharp' },
  { label: 'D♭', value: 'flat' },
]
