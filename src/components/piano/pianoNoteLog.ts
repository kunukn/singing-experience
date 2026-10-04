import type { AccidentalStyle } from '@/composables/accidentalStyle'
import type { ToneLabelMode } from '@/composables/toneLabelMode'
import { midiToNoteLabel } from '@/utils/noteUtils'

/*
 * One played note as log text, spelled the way the keyboard is labelled right
 * now: with the octave only in advanced mode (`D4`), and as a sharp or a flat
 * per the accidental style. "Off" has no label to copy, so it logs the bare
 * name like simple mode does.
 *
 * The log is text to paste elsewhere, so accidentals are ASCII (`C#`, `Db`) —
 * the ♯/♭ glyphs on the key faces are for display and paste poorly into chat,
 * code and notation tools. This undoes toAccidentalGlyph.
 */
export function formatNoteLogToken(
  midi: number,
  toneLabelMode: ToneLabelMode,
  accidentalStyle: AccidentalStyle,
): string {
  const { label } = midiToNoteLabel(midi, {
    showOctave: toneLabelMode === 'advanced',
    preferFlats: accidentalStyle === 'flat',
  })

  return label.replaceAll('♯', '#').replaceAll('♭', 'b')
}

/*
 * Adds a note to the end of the log. The text is user-editable, so the
 * separating space is skipped when it would double up: on an empty log, or
 * after whitespace the user typed (a newline to start a new phrase).
 */
export function appendNoteLogToken(text: string, token: string): string {
  const needsSeparator = text !== '' && !/\s$/.test(text)

  return needsSeparator ? `${text} ${token}` : `${text}${token}`
}
