import type { ToneLabelMode } from '@/composables/toneLabelMode'
import { midiToFlatLabel, midiToNoteLabel } from '@/utils/noteUtils'
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

/*
 * Flat spelling of a key, drawn as a second row under the sharp one (G♭ below
 * F♯) so a singer reading either convention finds their name on the key. Same
 * idea as the note sheets, which stack the two spellings over an accidental
 * notehead — but sharp-first here, matching PianoScaleSelect's "C♯ / D♭".
 *
 * White keys need no special case: midiToFlatLabel returns null for every
 * natural (and never spells C♭/F♭, so E and B stay bare).
 *
 * Silent in 'off' mode — the only labels there are octave markers, and a second
 * spelling row is exactly the clutter that mode exists to remove.
 *
 * Never carries the octave digit, even in 'advanced': the sharp label sitting
 * below it already does.
 */
export function pianoKeyFlatLabel(
  key: PianoKey,
  mode: ToneLabelMode,
): string | null {
  if (mode === 'off') return null

  return midiToFlatLabel(key.midi)
}
