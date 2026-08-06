import {
  midiToFlatLabel,
  midiToNoteLabel,
  SCALE_MODE_SEMITONES,
  type ScaleMode,
} from '@/utils/noteUtils'

/*
 * Curated subset of the 47 modes in noteUtils. Two filters, and only the first is
 * about legibility: the bebop and diminished modes reach 8 of the 12 pitch classes,
 * which reads as noise rather than as a shape. That alone rules out five modes.
 *
 * The rest of the cut is audience, not density — 36 modes sit at 7 pitch classes,
 * exactly as many as the Major already here, so Super Locrian ♭♭7 is left out for
 * being useless to a child learning to sing, not for being illegible. Anything at
 * 7 or fewer is fair game to add if it earns its place with singers.
 *
 * Shared with the piano (PianoScaleSelect), so adding here adds there.
 */
export const SCALE_HIGHLIGHT_MODES = [
  'ionian',
  'aeolian',
  'majorPentatonic',
  'minorPentatonic',
  'majorBlues',
  'minorBlues',
  /* Church modes, in degree order (2nd, 3rd, 4th, 5th, 7th of the major scale).
   * Appended rather than slotted in beside the Major so a stored scaleMode keeps
   * its meaning and the two names everyone knows stay at the top of the list. */
  'dorian',
  'phrygian',
  'lydian',
  'mixolydian',
  'locrian',
] as const satisfies readonly ScaleMode[]

export type ScaleHighlightMode = (typeof SCALE_HIGHLIGHT_MODES)[number]

export const DEFAULT_SCALE_HIGHLIGHT_MODE: ScaleHighlightMode = 'ionian'

/*
 * 'root' is the tonic pitch class, 'scale' the other members, null everything
 * else — including every note while highlighting is off.
 */
export type ScaleRole = 'root' | 'scale' | null

/*
 * How prominently a note's name should be drawn. Emphasis is earned, not the
 * default: only a note a chosen scale belongs to is promoted, so a board with no
 * scale on it draws every name in the stepped-back reading. Nothing there ranks
 * the notes, and promoting all of them equally would just be a louder board that
 * says the same thing.
 */
export type ScaleEmphasis = 'emphasized' | 'diminished'

export function scaleEmphasisFor(role: ScaleRole): ScaleEmphasis {
  return role ? 'emphasized' : 'diminished'
}

export type ScaleRootOption = { pitchClass: number; label: string }

const SEMITONES_PER_OCTAVE = 12

/* MIDI 60 = C4 — an arbitrary octave, used only to borrow noteUtils' naming. */
const LABEL_OCTAVE_MIDI = 60

export function isScaleHighlightMode(
  value: unknown,
): value is ScaleHighlightMode {
  return SCALE_HIGHLIGHT_MODES.includes(value as ScaleHighlightMode)
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
 * lights up every D on the instrument. Both spellings are shown so a singer
 * reading flats finds their key.
 */
export const SCALE_ROOT_OPTIONS: ScaleRootOption[] = Array.from(
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
  mode: ScaleHighlightMode,
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
 * How a note should be tinted. Takes the prebuilt pitch-class set so an
 * instrument of ~40 notes builds the scale once rather than once per note.
 */
export function scaleRoleForMidi(
  midi: number,
  root: number | null,
  pitchClasses: ReadonlySet<number>,
): ScaleRole {
  const pitchClass = pitchClassOf(midi)
  if (!pitchClasses.has(pitchClass)) return null

  return root !== null && pitchClass === pitchClassOf(root) ? 'root' : 'scale'
}
