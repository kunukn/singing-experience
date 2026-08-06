import type { ToneLabelMode } from '@/composables/toneLabelMode'
import { midiToNoteLabel } from '@/utils/noteUtils'

/*
 * Label drawn in a fret cell, or null for none.
 *
 * 'off' keeps the board clean but still names the open strings, with the octave
 * — the tuning is the board's identity and should survive a stripped-down view.
 * (The piano's 'off' mode keeps its C-key octave markers for the same reason.)
 * 'simple' and 'advanced' label every cell, with the octave digit only in
 * 'advanced'.
 *
 * Single spelling only. The piano stacks the flat under the sharp (G♭ below F♯),
 * but a 30px row leaves no height for a second line — flats are a later
 * iteration.
 */
export function guitarFretLabel(
  midi: number,
  fret: number,
  mode: ToneLabelMode,
): string | null {
  if (mode === 'off') {
    if (fret !== 0) return null

    return midiToNoteLabel(midi, { showOctave: true }).label
  }

  return midiToNoteLabel(midi, { showOctave: mode === 'advanced' }).label
}
