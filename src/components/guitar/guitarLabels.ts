import type { ToneLabelMode } from '@/composables/toneLabelMode'
import { midiToNoteLabel } from '@/utils/noteUtils'
import type { AccidentalStyle } from '@/composables/accidentalStyle'

/*
 * Label drawn in a fret cell, or null for none.
 *
 * 'off' keeps the board clean but still names the open strings, with the octave
 * — the tuning is the board's identity and should survive a stripped-down view.
 * (The piano's 'off' mode keeps its C-key octave markers for the same reason.)
 * 'simple' and 'advanced' label every cell, with the octave digit only in
 * 'advanced'.
 *
 * One spelling at a time, chosen by the singer. The piano can stack the flat
 * under the sharp (G♭ below F♯) because a key is tall; a 30px fret row already
 * carries a scale dot and a hover ring, so a second line would have to shrink
 * past legibility.
 */
export function guitarFretLabel(
  midi: number,
  fret: number,
  mode: ToneLabelMode,
  accidentalStyle: AccidentalStyle,
): string | null {
  const preferFlats = accidentalStyle === 'flat'

  if (mode === 'off') {
    if (fret !== 0) return null

    return midiToNoteLabel(midi, { showOctave: true, preferFlats }).label
  }

  return midiToNoteLabel(midi, {
    showOctave: mode === 'advanced',
    preferFlats,
  }).label
}
