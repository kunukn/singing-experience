import { chordPitchClasses, type ChordTypeId } from '@/utils/chordDetection'
import { pitchClassOf } from '@/utils/scaleHighlight'

/* Lowest MIDI note at or above `floorMidi` with the given pitch class. */
function lowestAtOrAbove(pitchClass: number, floorMidi: number): number {
  return floorMidi + pitchClassOf(pitchClass - floorMidi)
}

/*
 * MIDI notes to sound a chord: the bass (a slash chord's bass, else the root)
 * at the lowest spot at or above `floorMidi`, then each other chord note once,
 * as low as it goes above the bass. Close voicing keeps the chord within an
 * octave of the bass, so on the detector's short keyboards every played key is
 * one the singer can see light up (A♭7/E♭ from C3 = E♭3 G♭3 A♭3 C4). A 9th
 * lands a step above the root rather than above the octave.
 */
export function chordVoicing(
  root: number,
  type: ChordTypeId,
  bass: number | null,
  floorMidi: number,
): number[] {
  const bassPitchClass = pitchClassOf(bass ?? root)
  const bassMidi = lowestAtOrAbove(bassPitchClass, floorMidi)
  const upperNotes = [...chordPitchClasses(root, type)]
    .filter((pitchClass) => pitchClass !== bassPitchClass)
    .map((pitchClass) => lowestAtOrAbove(pitchClass, bassMidi))

  return [bassMidi, ...upperNotes.toSorted((a, b) => a - b)]
}
