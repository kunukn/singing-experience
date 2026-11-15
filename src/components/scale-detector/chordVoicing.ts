import { CHORD_TYPES, type ChordTypeId } from '@/utils/chordDetection'
import { pitchClassOf } from '@/utils/scaleHighlight'

/* Lowest MIDI note at or above `floorMidi` with the given pitch class. */
function lowestAtOrAbove(pitchClass: number, floorMidi: number): number {
  return floorMidi + pitchClassOf(pitchClass - floorMidi)
}

/*
 * MIDI notes to sound a chord: root position from the lowest root at or
 * above `floorMidi`, with a slash chord's bass note under it
 * (A♭7/E♭ from C3 = E♭3 · A♭3 C4 E♭4 G♭4).
 */
export function chordVoicing(
  root: number,
  type: ChordTypeId,
  bass: number | null,
  floorMidi: number,
): number[] {
  const { semitones } = CHORD_TYPES.find((chordType) => chordType.id === type)!
  const bassMidi = lowestAtOrAbove(bass ?? root, floorMidi)
  const rootMidi = lowestAtOrAbove(root, bassMidi)
  const chord = semitones.map((semitone) => rootMidi + semitone)

  return rootMidi === bassMidi ? chord : [bassMidi, ...chord]
}
