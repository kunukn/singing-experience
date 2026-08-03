import type { ToneLabelMode } from '@/composables/toneLabelMode'
import { midiToNoteLabel } from '@/utils/noteUtils'
import type { PianoKey } from './pianoLayout'

export type PianoRange = { midiMin: number; midiMax: number }

/* The two range boundaries always get a label, so the singer sees where the
 * selected voice range starts and ends (e.g. A3 / A5 for Mezzo-Soprano). */
function isRangeEdge(key: PianoKey, range: PianoRange): boolean {
  return key.midi === range.midiMin || key.midi === range.midiMax
}

/*
 * Label drawn on a key's face, or null for none.
 *
 * 'off' keeps the keyboard clean: only the C-key octave markers (key.label,
 * which buildPianoLayout sets on white C keys) and the two range edges, which
 * carry the octave so the range reads unambiguously. 'simple' and 'advanced'
 * label every key, with the octave digit only in 'advanced'.
 *
 * Black keys need no separate rule: their key.label is always null, so in 'off'
 * they fall through to the range-edge check.
 */
export function pianoKeyLabel(
  key: PianoKey,
  mode: ToneLabelMode,
  range: PianoRange,
): string | null {
  if (mode === 'off') {
    if (key.label) return key.label
    if (isRangeEdge(key, range))
      return midiToNoteLabel(key.midi, { showOctave: true }).label

    return null
  }

  return midiToNoteLabel(key.midi, { showOctave: mode === 'advanced' }).label
}
