import type { AccidentalStyle } from '@/composables/accidentalStyle'
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
 *
 * On a black key this is the leading spelling of the pair — the one the singer
 * picked with the accidental style. The C-octave markers are naturals, so they
 * read the same either way.
 */
export function pianoKeyLabel(
  key: PianoKey,
  mode: ToneLabelMode,
  range: PianoRange,
  accidentalStyle: AccidentalStyle,
): string | null {
  const preferFlats = accidentalStyle === 'flat'

  if (mode === 'off') {
    if (key.label) return key.label
    if (isRangeEdge(key, range))
      return midiToNoteLabel(key.midi, { showOctave: true, preferFlats }).label

    return null
  }

  return midiToNoteLabel(key.midi, {
    showOctave: mode === 'advanced',
    preferFlats,
  }).label
}

/*
 * The spelling pianoKeyLabel did not use, drawn as a second row under it (G♭
 * below F♯, or F♯ below G♭) so a singer reading either convention finds their
 * name on the key. Same idea as the note sheets, which stack the two spellings
 * over an accidental notehead — the accidental style decides only which of them
 * leads; unlike the guitar, neither one is ever dropped.
 *
 * White keys need no special case: midiToFlatLabel returns null for every
 * natural (and never spells C♭/F♭, so E and B stay bare), which is also what
 * marks a key as having a second spelling at all.
 *
 * Silent in 'off' mode — the only labels there are octave markers, and a second
 * spelling row is exactly the clutter that mode exists to remove.
 *
 * Never carries the octave digit, even in 'advanced': the leading label above
 * it already does.
 */
export function pianoKeyAltLabel(
  key: PianoKey,
  mode: ToneLabelMode,
  accidentalStyle: AccidentalStyle,
): string | null {
  if (mode === 'off') return null

  const flatLabel = midiToFlatLabel(key.midi)
  if (!flatLabel) return null

  return accidentalStyle === 'flat'
    ? midiToNoteLabel(key.midi, { showOctave: false }).label
    : flatLabel
}
