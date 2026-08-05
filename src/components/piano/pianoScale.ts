import {
  midiToFlatLabel,
  midiToNoteLabel,
  SCALE_MODE_SEMITONES,
  type ScaleMode,
} from '@/utils/noteUtils'

/*
 * Curated subset of the 46 modes in noteUtils — the shapes that read clearly as
 * a pattern on a keyboard. The bebop and diminished modes light up 8–9 of the
 * 12 pitch classes, which reads as noise rather than as a scale.
 */
export const PIANO_SCALE_MODES = [
  'ionian',
  'aeolian',
  'majorPentatonic',
  'minorPentatonic',
  'majorBlues',
  'minorBlues',
] as const satisfies readonly ScaleMode[]

export type PianoScaleMode = (typeof PIANO_SCALE_MODES)[number]

export const DEFAULT_PIANO_SCALE_MODE: PianoScaleMode = 'ionian'

/*
 * 'root' is the tonic pitch class, 'scale' the other members, null everything
 * else — including every key while highlighting is off.
 */
export type PianoKeyScaleRole = 'root' | 'scale' | null

export type PianoScaleRootOption = { pitchClass: number; label: string }

const SEMITONES_PER_OCTAVE = 12

/* MIDI 60 = C4 — an arbitrary octave, used only to borrow noteUtils' naming. */
const LABEL_OCTAVE_MIDI = 60

export function isPianoScaleMode(value: unknown): value is PianoScaleMode {
  return PIANO_SCALE_MODES.includes(value as PianoScaleMode)
}

/** Chroma 0–11 (C = 0) of a MIDI note, safe for negative input. */
export function pitchClassOf(midi: number): number {
  return (
    ((midi % SEMITONES_PER_OCTAVE) + SEMITONES_PER_OCTAVE) %
    SEMITONES_PER_OCTAVE
  )
}

/*
 * The 12 pitch classes, labelled from the C4 octave: "C", "C♯ / D♭", "D", …
 * The octave is irrelevant — highlighting matches on pitch class, so picking D
 * lights up every D on the board. Both spellings are shown so a singer reading
 * flats finds their key.
 */
export const PIANO_SCALE_ROOT_OPTIONS: PianoScaleRootOption[] = Array.from(
  { length: SEMITONES_PER_OCTAVE },
  (_, pitchClass) => {
    const midi = LABEL_OCTAVE_MIDI + pitchClass
    const sharpLabel = midiToNoteLabel(midi, { showOctave: false }).label
    const flatLabel = midiToFlatLabel(midi)

    return {
      pitchClass,
      label: flatLabel ? `${sharpLabel} / ${flatLabel}` : sharpLabel,
    }
  },
)

/**
 * Pitch classes belonging to `mode` rooted on `root`, or an empty set when
 * `root` is null (highlighting off) — so "off" needs no special case at the
 * call site.
 *
 * Every SCALE_MODE_SEMITONES array ends with the octave (12), a duplicate of
 * the root's pitch class; the Set collapses it.
 */
export function buildScalePitchClasses(
  root: number | null,
  mode: PianoScaleMode,
): ReadonlySet<number> {
  if (root === null) return new Set()

  const rootPitchClass = pitchClassOf(root)

  return new Set(
    SCALE_MODE_SEMITONES[mode].map((semitone) =>
      pitchClassOf(rootPitchClass + semitone),
    ),
  )
}

/**
 * How a key should be tinted. Takes the prebuilt pitch-class set so a keyboard
 * of ~40 keys builds the scale once rather than once per key.
 */
export function pianoKeyScaleRole(
  midi: number,
  root: number | null,
  pitchClasses: ReadonlySet<number>,
): PianoKeyScaleRole {
  const pitchClass = pitchClassOf(midi)
  if (!pitchClasses.has(pitchClass)) return null

  return root !== null && pitchClass === pitchClassOf(root) ? 'root' : 'scale'
}
