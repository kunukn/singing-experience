import { useLocalStorage } from '@vueuse/core'

/*
 * How the five accidental pitch classes are spelled — C♯ or D♭.
 *
 * What the choice does depends on how much room the instrument has. A 30px
 * guitar fret row that already holds a scale dot and a hover ring has no height
 * for a second line of type, so there the style picks the one spelling drawn.
 * A piano key can stack the pair, so there both spellings stay on the key and
 * the style picks which one leads — on top, emphasised, carrying the octave.
 */
export type AccidentalStyle = 'sharp' | 'flat'

const ACCIDENTAL_STYLES: readonly AccidentalStyle[] = ['sharp', 'flat']

export function isAccidentalStyle(value: unknown): value is AccidentalStyle {
  return ACCIDENTAL_STYLES.includes(value as AccidentalStyle)
}

/*
 * Accidental style persisted per page, with anything unrecognised resolved back
 * to the caller's default. Mirrors useToneLabelMode: useLocalStorage hands back
 * whatever the key holds, and every consumer tests for 'flat' by equality, so a
 * junk value would silently read as 'sharp' rather than falling back. The
 * stored value is repaired on load, and the getter stays defensive against a
 * write from outside the app afterwards.
 */
export function useAccidentalStyle(
  storageKey: string,
  defaultStyle: AccidentalStyle,
) {
  const storedStyle = useLocalStorage<AccidentalStyle>(storageKey, defaultStyle)

  if (!isAccidentalStyle(storedStyle.value)) storedStyle.value = defaultStyle

  return computed<AccidentalStyle>({
    get: () =>
      isAccidentalStyle(storedStyle.value) ? storedStyle.value : defaultStyle,
    set: (style) => {
      storedStyle.value = style
    },
  })
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
