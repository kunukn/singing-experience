import { SCALE_MODE_SEMITONES } from '@/utils/noteUtils'
import { keyAccidentalStyle, pitchClassLabel } from '@/utils/scaleDetection'
import { pitchClassOf } from '@/utils/scaleHighlight'

import type { NoteUse, TakeKey } from './analyzeTake'

export type ScaleNoteChip = {
  pitchClass: number
  label: string
  isSung: boolean
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
