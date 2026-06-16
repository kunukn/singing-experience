import {
  BASS_MAX_MIDI,
  BASS_MIN_MIDI,
  BASS_OUTLIER_HIGH_MAX_MIDI,
  BASS_OUTLIER_HIGH_MIN_MIDI,
  BASS_OUTLIER_LOW_MAX_MIDI,
  BASS_OUTLIER_LOW_MIN_MIDI,
  CLEF_LABEL_KEYS,
  TREBLE_MAX_MIDI,
  TREBLE_MIN_MIDI,
  TREBLE_OUTLIER_HIGH_MAX_MIDI,
  TREBLE_OUTLIER_HIGH_MIN_MIDI,
  TREBLE_OUTLIER_LOW_MAX_MIDI,
  TREBLE_OUTLIER_LOW_MIN_MIDI,
  type ClefKey,
} from './notesConstants'

export type NoteScale = {
  clef: ClefKey
  /* Absolute MIDI notes, ascending chromatically (one eighth note each). The
   * start tone is fixed per clef, so these are sounding pitches with no
   * transposition applied. */
  midis: number[]
}

/* Inclusive chromatic MIDI range → ascending list of every semitone. */
export function chromaticRange(minMidi: number, maxMidi: number): number[] {
  return Array.from(
    { length: maxMidi - minMidi + 1 },
    (_, index) => minMidi + index,
  )
}

/* One entry per clef, indexed to match CLEF_LABEL_KEYS so a clef index selects
 * both the scale and its i18n label. */
export const NOTE_SCALES: NoteScale[] = [
  {
    clef: CLEF_LABEL_KEYS[0],
    midis: chromaticRange(TREBLE_MIN_MIDI, TREBLE_MAX_MIDI),
  },
  {
    clef: CLEF_LABEL_KEYS[1],
    midis: chromaticRange(BASS_MIN_MIDI, BASS_MAX_MIDI),
  },
]

type OutlierScale = {
  /* Outliers below the covered range (lower ledger lines). */
  low: number[]
  /* Outliers above the covered range (upper ledger lines). */
  high: number[]
}

/* Per-clef outlier clusters for the beyond-the-staff reference sheets. Each
 * cluster is chromatic and includes its boundary anchor (see notesConstants). */
export const OUTLIER_SCALES: Record<ClefKey, OutlierScale> = {
  treble: {
    low: chromaticRange(
      TREBLE_OUTLIER_LOW_MIN_MIDI,
      TREBLE_OUTLIER_LOW_MAX_MIDI,
    ),
    high: chromaticRange(
      TREBLE_OUTLIER_HIGH_MIN_MIDI,
      TREBLE_OUTLIER_HIGH_MAX_MIDI,
    ),
  },
  bass: {
    low: chromaticRange(BASS_OUTLIER_LOW_MIN_MIDI, BASS_OUTLIER_LOW_MAX_MIDI),
    high: chromaticRange(
      BASS_OUTLIER_HIGH_MIN_MIDI,
      BASS_OUTLIER_HIGH_MAX_MIDI,
    ),
  },
}
