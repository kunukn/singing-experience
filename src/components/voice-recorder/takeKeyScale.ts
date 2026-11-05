import { SCALE_MODE_SEMITONES } from '@/utils/noteUtils'
import {
  keyAccidentalStyle,
  pitchClassLabel,
  type ScaleCandidate,
} from '@/utils/scaleDetection'
import { pitchClassOf } from '@/utils/scaleHighlight'

import type { NoteUse, TakeKey } from './analyzeTake'

export type ScaleNoteChip = {
  pitchClass: number
  label: string
  isSung: boolean
}

function isMajorOrMinor({ mode }: ScaleCandidate): boolean {
  return mode === 'ionian' || mode === 'aeolian'
}

/*
 * The major and minor names for a home most singers won't know: F Mixolydian
 * has the notes of B♭ major and G minor. A major or minor home needs no help.
 */
export function familiarTwins([
  home,
  ...twins
]: ScaleCandidate[]): ScaleCandidate[] {
  return isMajorOrMinor(home) ? [] : twins.filter(isMajorOrMinor)
}

/* The highest root at or below the lowest sung note, so the scale plays in the singer's own voice. */
export function scalePreviewRootMidi(
  root: number,
  notesUsed: NoteUse[],
): number {
  const lowestMidi = Math.min(...notesUsed.map((use) => use.midi))

  return lowestMidi - pitchClassOf(lowestMidi - root)
}

export function scaleNoteChips(
  { root, mode }: Pick<TakeKey, 'root' | 'mode'>,
  notesUsed: NoteUse[],
): ScaleNoteChip[] {
  const accidentalStyle = keyAccidentalStyle(root, mode)
  const sungPitchClasses = new Set(
    notesUsed.map((use) => pitchClassOf(use.midi)),
  )

  /* Every mode's semitones end with the octave, which repeats the root. */
  return SCALE_MODE_SEMITONES[mode].slice(0, -1).map((semitone) => {
    const pitchClass = pitchClassOf(root + semitone)

    return {
      pitchClass,
      label: pitchClassLabel(pitchClass, accidentalStyle),
      isSung: sungPitchClasses.has(pitchClass),
    }
  })
}
