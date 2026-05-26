import { CLEAN_CENTS } from '@/utils/pitchColors'

const NOTE_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
] as const

/* Descending chromatic order — B (highest) first, C (lowest) last; use for dropdowns */
const NOTE_NAMES_HIGH_TO_LOW =
  NOTE_NAMES.toReversed() as readonly (typeof NOTE_NAMES)[number][]

export type NoteName = (typeof NOTE_NAMES)[number]

export type NoteInfo = {
  note: NoteName
  octave: number
  cents: number
  midiNote: number
  frequency: number
}

/**
 * Convert a frequency in Hz to a raw (non-rounded) MIDI note number.
 * Uses A4 = 440 Hz as the reference pitch (MIDI 69).
 */
export function frequencyToMidi(hz: number): number {
  // 12 semitones/octave × log₂(hz / A4) + 69 (A4's MIDI number)
  return 12 * Math.log2(hz / 440) + 69
}

/**
 * Calculate the cents deviation between two frequencies.
 * Positive = `hz` is higher than `referenceHz`.
 */
export function frequencyToCents(hz: number, referenceHz: number): number {
  // 1200 cents = 1 octave; log₂ ratio gives the interval in octaves
  return Math.round(1200 * Math.log2(hz / referenceHz))
}

/**
 * Convert a frequency in Hz to the nearest musical note with cents deviation.
 * Uses A4 = 440 Hz as the reference pitch.
 *
 * When `previousMidi` is supplied, hysteresis is applied: the detected note
 * only changes when the raw MIDI value deviates *more than* 0.5 semitones
 * (> 50 cents) from the previous note. This prevents the displayed note from
 * flickering when the pitch sits exactly on the midpoint between two semitones.
 */
export function frequencyToNote(
  hz: number,
  previousMidi?: number,
): NoteInfo | null {
  if (hz <= 0 || !isFinite(hz)) return null

  const rawMidi = frequencyToMidi(hz)

  let midiNote: number
  if (previousMidi !== undefined) {
    const deviation = rawMidi - previousMidi
    // > 0.5 semitones (50 cents) — must clearly cross the midpoint to switch notes
    midiNote = Math.abs(deviation) > 0.5 ? Math.round(rawMidi) : previousMidi
  } else {
    midiNote = Math.round(rawMidi)
  }

  // Double-modulo wraps negative MIDI values safely into 0–11 note index
  const noteIndex = ((midiNote % 12) + 12) % 12
  // MIDI octave: C-1 = MIDI 0, so octave = floor(midi/12) - 1
  const octave = Math.floor(midiNote / 12) - 1

  const perfectFrequency = 440 * Math.pow(2, (midiNote - 69) / 12)
  const cents = frequencyToCents(hz, perfectFrequency)

  return {
    note: NOTE_NAMES[noteIndex],
    octave,
    cents,
    midiNote,
    frequency: hz,
  }
}

/**
 * Convert a note name and octave to its perfect frequency in Hz.
 * Uses A4 = 440 Hz as the reference pitch.
 */
export function noteToFrequency(note: NoteName, octave: number): number {
  const noteIndex = NOTE_NAMES.indexOf(note)
  // Reverse MIDI formula: (octave + 1) accounts for C-1 = MIDI 0
  const midiNote = (octave + 1) * 12 + noteIndex

  return 440 * Math.pow(2, (midiNote - 69) / 12)
}

/**
 * Convert a MIDI note number to its frequency in Hz.
 * Uses A4 = 440 Hz as the reference pitch.
 */
export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

/**
 * Convert a frequency in Hz to a note name string like "C4" or "F#3".
 * Returns null if frequency is invalid.
 */
export function frequencyToNoteName(hz: number): string | null {
  const info = frequencyToNote(hz)
  if (!info) return null

  return `${info.note}${info.octave}`
}

/* MIDI note number for C3 (middle-ish C in scientific pitch notation) */
const C3_MIDI = 48

const SOLFEGE_LABELS = ['DO', 'RE', 'MI', 'FA', 'SO', 'LA', 'TI', 'DO'] as const

/*
 * Per-mode solfege labels for scales that differ from the standard 8-label DO–DO.
 * Modes not listed here fall back to SOLFEGE_LABELS.
 */
const SCALE_SOLFEGE_OVERRIDES: Partial<Record<ScaleMode, readonly string[]>> = {
  /* Jazz / Bebop (9 notes) */
  majorBebop: ['DO', 'RE', 'MI', 'FA', 'SO', '♭LA', 'LA', 'TI', 'DO'],
  dominantBebop: ['DO', 'RE', 'MI', 'FA', 'SO', 'LA', '♭TI', 'TI', 'DO'],
  minorBebop: ['DO', 'RE', '♭MI', 'FA', 'SO', '♭LA', 'LA', 'TI', 'DO'],
  /* Blues & Pentatonic (6–7 notes) */
  majorPentatonic: ['DO', 'RE', 'MI', 'SO', 'LA', 'DO'],
  minorPentatonic: ['DO', '♭MI', 'FA', 'SO', '♭TI', 'DO'],
  majorBlues: ['DO', 'RE', '♭MI', 'MI', 'SO', 'LA', 'DO'],
  minorBlues: ['DO', '♭MI', 'FA', '♭SO', 'SO', '♭TI', 'DO'],
  /* Symmetric (7–9 notes) */
  wholeTone: ['DO', 'RE', 'MI', '♯FA', '♯SO', '♯LA', 'DO'],
  diminishedHalfWhole: [
    'DO',
    '♭RE',
    '♭MI',
    'MI',
    '♯FA',
    'SO',
    'LA',
    '♭TI',
    'DO',
  ],
  diminishedWholeHalf: [
    'DO',
    'RE',
    '♭MI',
    'FA',
    '♭SO',
    '♭LA',
    'LA',
    'TI',
    'DO',
  ],
  augmented: ['DO', '♭MI', 'MI', 'SO', '♯SO', 'TI', 'DO'],
}

function getSolfegeLabels(mode: ScaleMode): readonly string[] {
  return SCALE_SOLFEGE_OVERRIDES[mode] ?? SOLFEGE_LABELS
}

/* Major scale intervals in semitones from root */
const MAJOR_SCALE_SEMITONES = [0, 2, 4, 5, 7, 9, 11, 12]

type ScaleMode =
  /* Church modes */
  | 'ionian'
  | 'dorian'
  | 'phrygian'
  | 'lydian'
  | 'mixolydian'
  | 'aeolian'
  | 'locrian'
  /* Melodic Minor modes */
  | 'melodicMinor'
  | 'dorianFlat2'
  | 'lydianAugmented'
  | 'lydianDominant'
  | 'mixolydianFlat6'
  | 'locrianSharp2'
  | 'alteredScale'
  /* Harmonic Minor modes */
  | 'harmonicMinor'
  | 'locrianSharp6'
  | 'ionianSharp5'
  | 'ukrainianDorian'
  | 'phrygianDominant'
  | 'lydianSharp2'
  | 'superLocrianDoubleFlat7'
  /* Harmonic Major modes */
  | 'harmonicMajor'
  | 'dorianFlat5'
  | 'phrygianFlat4'
  | 'lydianFlat3'
  | 'mixolydianFlat2'
  | 'lydianAugmentedSharp2'
  | 'locrianDoubleFlat7'
  /* World / Ethnic */
  | 'doubleHarmonic'
  | 'hungarianMinor'
  | 'hungarianMajor'
  | 'neapolitanMinor'
  | 'neapolitanMajor'
  | 'persian'
  | 'majorLocrian'
  | 'leadingWholeTone'
  /* Jazz / Bebop */
  | 'majorBebop'
  | 'dominantBebop'
  | 'minorBebop'
  /* Blues & Pentatonic */
  | 'minorPentatonic'
  | 'majorPentatonic'
  | 'minorBlues'
  | 'majorBlues'
  /* Symmetric */
  | 'wholeTone'
  | 'diminishedHalfWhole'
  | 'diminishedWholeHalf'
  | 'augmented'

const SCALE_MODE_SEMITONES: Record<ScaleMode, readonly number[]> = {
  /* Church modes */
  ionian: [0, 2, 4, 5, 7, 9, 11, 12],
  dorian: [0, 2, 3, 5, 7, 9, 10, 12],
  phrygian: [0, 1, 3, 5, 7, 8, 10, 12],
  lydian: [0, 2, 4, 6, 7, 9, 11, 12],
  mixolydian: [0, 2, 4, 5, 7, 9, 10, 12],
  aeolian: [0, 2, 3, 5, 7, 8, 10, 12],
  locrian: [0, 1, 3, 5, 6, 8, 10, 12],
  /* Melodic Minor modes */
  melodicMinor: [0, 2, 3, 5, 7, 9, 11, 12],
  dorianFlat2: [0, 1, 3, 5, 7, 9, 10, 12],
  lydianAugmented: [0, 2, 4, 6, 8, 9, 11, 12],
  lydianDominant: [0, 2, 4, 6, 7, 9, 10, 12],
  mixolydianFlat6: [0, 2, 4, 5, 7, 8, 10, 12],
  locrianSharp2: [0, 2, 3, 5, 6, 8, 10, 12],
  alteredScale: [0, 1, 3, 4, 6, 8, 10, 12],
  /* Harmonic Minor modes */
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11, 12],
  locrianSharp6: [0, 1, 3, 5, 6, 9, 10, 12],
  ionianSharp5: [0, 2, 4, 5, 8, 9, 11, 12],
  ukrainianDorian: [0, 2, 3, 6, 7, 9, 10, 12],
  phrygianDominant: [0, 1, 4, 5, 7, 8, 10, 12],
  lydianSharp2: [0, 3, 4, 6, 7, 9, 11, 12],
  superLocrianDoubleFlat7: [0, 1, 3, 4, 6, 8, 9, 12],
  /* Harmonic Major modes */
  harmonicMajor: [0, 2, 4, 5, 7, 8, 11, 12],
  dorianFlat5: [0, 2, 3, 5, 6, 9, 10, 12],
  phrygianFlat4: [0, 1, 3, 4, 7, 8, 10, 12],
  lydianFlat3: [0, 2, 3, 6, 7, 9, 11, 12],
  mixolydianFlat2: [0, 1, 4, 5, 7, 9, 10, 12],
  lydianAugmentedSharp2: [0, 3, 4, 6, 8, 9, 11, 12],
  locrianDoubleFlat7: [0, 1, 3, 5, 6, 8, 9, 12],
  /* World / Ethnic */
  doubleHarmonic: [0, 1, 4, 5, 7, 8, 11, 12],
  hungarianMinor: [0, 2, 3, 6, 7, 8, 11, 12],
  hungarianMajor: [0, 3, 4, 6, 7, 9, 10, 12],
  neapolitanMinor: [0, 1, 3, 5, 7, 8, 11, 12],
  neapolitanMajor: [0, 1, 3, 5, 7, 9, 11, 12],
  persian: [0, 1, 4, 5, 6, 8, 11, 12],
  majorLocrian: [0, 2, 4, 5, 6, 8, 10, 12],
  leadingWholeTone: [0, 2, 4, 6, 8, 10, 11, 12],
  /* Jazz / Bebop — 9-note scales (chromatic passing tone included) */
  majorBebop: [0, 2, 4, 5, 7, 8, 9, 11, 12],
  dominantBebop: [0, 2, 4, 5, 7, 9, 10, 11, 12],
  minorBebop: [0, 2, 3, 5, 7, 8, 9, 11, 12],
  /* Blues & Pentatonic — 6 or 7 notes */
  majorPentatonic: [0, 2, 4, 7, 9, 12],
  minorPentatonic: [0, 3, 5, 7, 10, 12],
  majorBlues: [0, 2, 3, 4, 7, 9, 12],
  minorBlues: [0, 3, 5, 6, 7, 10, 12],
  /* Symmetric */
  wholeTone: [0, 2, 4, 6, 8, 10, 12],
  diminishedHalfWhole: [0, 1, 3, 4, 6, 7, 9, 10, 12],
  diminishedWholeHalf: [0, 2, 3, 5, 6, 8, 9, 11, 12],
  augmented: [0, 3, 4, 7, 8, 11, 12],
}

type ScaleModeOption = {
  id: ScaleMode
  label: string
}

type ScaleModeGroup = {
  label: string
  items: ScaleModeOption[]
}

const SCALE_MODE_GROUPS: ScaleModeGroup[] = [
  {
    label: 'Church Modes',
    items: [
      { id: 'ionian', label: 'Major (Ionian)' },
      { id: 'dorian', label: 'Dorian' },
      { id: 'phrygian', label: 'Phrygian' },
      { id: 'lydian', label: 'Lydian' },
      { id: 'mixolydian', label: 'Mixolydian' },
      { id: 'aeolian', label: 'Minor (Aeolian)' },
      { id: 'locrian', label: 'Locrian' },
    ],
  },
  {
    label: 'Melodic Minor',
    items: [
      { id: 'melodicMinor', label: 'Melodic Minor' },
      { id: 'dorianFlat2', label: 'Dorian ♭2' },
      { id: 'lydianAugmented', label: 'Lydian Augmented' },
      { id: 'lydianDominant', label: 'Lydian Dominant' },
      { id: 'mixolydianFlat6', label: 'Mixolydian ♭6' },
      { id: 'locrianSharp2', label: 'Locrian ♮2' },
      { id: 'alteredScale', label: 'Altered Scale' },
    ],
  },
  {
    label: 'Harmonic Minor',
    items: [
      { id: 'harmonicMinor', label: 'Harmonic Minor' },
      { id: 'locrianSharp6', label: 'Locrian ♮6' },
      { id: 'ionianSharp5', label: 'Ionian ♯5' },
      { id: 'ukrainianDorian', label: 'Ukrainian Dorian' },
      { id: 'phrygianDominant', label: 'Phrygian Dominant' },
      { id: 'lydianSharp2', label: 'Lydian ♯2' },
      { id: 'superLocrianDoubleFlat7', label: 'Super Locrian ♭♭7' },
    ],
  },
  {
    label: 'Harmonic Major',
    items: [
      { id: 'harmonicMajor', label: 'Harmonic Major' },
      { id: 'dorianFlat5', label: 'Dorian ♭5' },
      { id: 'phrygianFlat4', label: 'Phrygian ♭4' },
      { id: 'lydianFlat3', label: 'Lydian ♭3' },
      { id: 'mixolydianFlat2', label: 'Mixolydian ♭2' },
      { id: 'lydianAugmentedSharp2', label: 'Lydian Augmented ♯2' },
      { id: 'locrianDoubleFlat7', label: 'Locrian ♭♭7' },
    ],
  },
  {
    label: 'World / Ethnic',
    items: [
      { id: 'doubleHarmonic', label: 'Double Harmonic (Byzantine)' },
      { id: 'hungarianMinor', label: 'Hungarian Minor' },
      { id: 'hungarianMajor', label: 'Hungarian Major' },
      { id: 'neapolitanMinor', label: 'Neapolitan Minor' },
      { id: 'neapolitanMajor', label: 'Neapolitan Major' },
      { id: 'persian', label: 'Persian' },
      { id: 'majorLocrian', label: 'Major Locrian' },
      { id: 'leadingWholeTone', label: 'Leading Whole Tone' },
    ],
  },
  {
    label: 'Jazz / Bebop',
    items: [
      { id: 'majorBebop', label: 'Major Bebop' },
      { id: 'dominantBebop', label: 'Dominant Bebop' },
      { id: 'minorBebop', label: 'Minor Bebop' },
    ],
  },
  {
    label: 'Blues & Pentatonic',
    items: [
      { id: 'majorPentatonic', label: 'Major Pentatonic' },
      { id: 'minorPentatonic', label: 'Minor Pentatonic' },
      { id: 'majorBlues', label: 'Major Blues' },
      { id: 'minorBlues', label: 'Minor Blues' },
    ],
  },
  {
    label: 'Symmetric',
    items: [
      { id: 'wholeTone', label: 'Whole Tone' },
      { id: 'diminishedHalfWhole', label: 'Diminished (Half-Whole)' },
      { id: 'diminishedWholeHalf', label: 'Diminished (Whole-Half)' },
      { id: 'augmented', label: 'Augmented' },
    ],
  },
]

const SCALE_MODE_OPTIONS: ScaleModeOption[] = SCALE_MODE_GROUPS.flatMap(
  (g) => g.items,
)

type ScaleNote = {
  solfege: string
  note: NoteName
  octave: number
}

/**
 * Build a scale starting from the given MIDI root note using the specified mode.
 */
function buildScale(
  rootMidiNote: number,
  mode: ScaleMode = 'ionian',
): ScaleNote[] {
  const semitones = SCALE_MODE_SEMITONES[mode]
  const solfegeLabels = getSolfegeLabels(mode)

  return semitones.map((semitone, i) => {
    const midi = rootMidiNote + semitone
    const noteIndex = ((midi % 12) + 12) % 12
    const octave = Math.floor(midi / 12) - 1

    return {
      solfege: solfegeLabels[i],
      note: NOTE_NAMES[noteIndex],
      octave,
    }
  })
}

/**
 * Build a major scale (DO–DO) starting from the given MIDI root note.
 */
function buildMajorScale(rootMidiNote: number): ScaleNote[] {
  return buildScale(rootMidiNote, 'ionian')
}

type VoiceTier = 'high' | 'mid' | 'low'

type StartToneOption = {
  offset: number
  label: string
  midiNote: number
  voiceTier: VoiceTier
}

/*
 * Maps a MIDI note to one of three voice tiers used as i18n keys.
 * Boundaries: high ≥ 59 (B3–G4), mid 51–58 (D#3–A#3), low ≤ 50 (G2–D3).
 * The default start tone G3 (MIDI 55) falls in 'mid'.
 */
function getVoiceTier(midi: number): VoiceTier {
  if (midi >= 59) return 'high'
  if (midi >= 51) return 'mid'
  return 'low'
}

/*
 * 25 starting tone options spanning G4 (offset 19) down to G2 (offset −5),
 * covering typical singing ranges from soprano highs to baritone lows.
 */
const START_TONE_OPTIONS: StartToneOption[] = Array.from(
  { length: 25 },
  (_, i) => {
    const offset = 19 - i // highest offset first, descending
    const midi = C3_MIDI + offset
    const noteIndex = ((midi % 12) + 12) % 12
    const octave = Math.floor(midi / 12) - 1
    const label = `${NOTE_NAMES[noteIndex]}${octave}`

    return { offset, label, midiNote: midi, voiceTier: getVoiceTier(midi) }
  },
)

type StartToneGroup = {
  voiceTier: VoiceTier
  items: StartToneOption[]
}

/* Group start-tone options by voice tier (high → mid → low), preserving the
 * descending pitch order of START_TONE_OPTIONS within each group. */
const START_TONE_GROUPS: StartToneGroup[] = (['high', 'mid', 'low'] as const)
  .map((voiceTier) => ({
    voiceTier,
    items: START_TONE_OPTIONS.filter((o) => o.voiceTier === voiceTier),
  }))
  .filter((g) => g.items.length > 0)

type MidiNoteLabel = {
  note: NoteName
  octave: number
  label: string
}

/**
 * Convert a MIDI note number to its note name, octave, and display label.
 */
function midiToNoteLabel(midi: number): MidiNoteLabel {
  const noteIndex = ((midi % 12) + 12) % 12
  const octave = Math.floor(midi / 12) - 1
  const note = NOTE_NAMES[noteIndex]

  return { note, octave, label: `${note}${octave}` }
}

/**
 * Generate evenly-spaced notes across a MIDI range.
 * Returns ScaleNote[] suitable for playSequence().
 */
function midiRangeToScaleNotes(
  midiMin: number,
  midiMax: number,
  count = 5,
): ScaleNote[] {
  if (count < 2) return []

  const step = Math.max(1, Math.round((midiMax - midiMin) / (count - 1)))
  const notes: ScaleNote[] = []

  for (let i = 0; i < count - 1; i++) {
    const midi = midiMin + i * step
    if (midi > midiMax) break

    const noteIndex = ((midi % 12) + 12) % 12
    const octave = Math.floor(midi / 12) - 1
    notes.push({ solfege: '', note: NOTE_NAMES[noteIndex], octave })
  }

  // Always include midiMax as the final note
  const noteIndex = ((midiMax % 12) + 12) % 12
  const octave = Math.floor(midiMax / 12) - 1
  notes.push({ solfege: '', note: NOTE_NAMES[noteIndex], octave })

  return notes
}

type ChromaticDisplayNote = {
  note: NoteName
  octave: number
  /** Semitone offset from the root (0–12) */
  semitone: number
}

/**
 * Build the full chromatic scale from a root MIDI note — 13 notes (root to root + 12).
 */
function buildChromaticDisplayScale(rootMidi: number): ChromaticDisplayNote[] {
  return Array.from({ length: 13 }, (_, i) => {
    const midi = rootMidi + i
    const noteIndex = ((midi % 12) + 12) % 12
    const octave = Math.floor(midi / 12) - 1

    return { note: NOTE_NAMES[noteIndex], octave, semitone: i }
  })
}

/*
 * Appends a signed cents suffix to a note label when the pitch is off by more
 * than `threshold` cents. Defaults to CLEAN_CENTS (10¢ — the imperceptibly-
 * on-pitch deadband, see pitchColors.ts). Callers wanting a more forgiving
 * display (e.g. warm-up) can pass a larger threshold.
 *   formatNoteLabelWithCents('C4', 3)        → 'C4'
 *   formatNoteLabelWithCents('C4', 12)       → 'C4 +12¢'
 *   formatNoteLabelWithCents('C4', -25)      → 'C4 -25¢'
 *   formatNoteLabelWithCents('C4', 15, 20)   → 'C4'
 */
export function formatNoteLabelWithCents(
  label: string,
  cents: number,
  threshold: number = CLEAN_CENTS,
): string {
  if (Math.abs(cents) <= threshold) return label

  const signed = cents > 0 ? `+${cents}` : `${cents}`
  return `${label} ${signed}¢`
}

export {
  buildChromaticDisplayScale,
  buildMajorScale,
  buildScale,
  C3_MIDI,
  MAJOR_SCALE_SEMITONES,
  midiRangeToScaleNotes,
  midiToNoteLabel,
  NOTE_NAMES,
  NOTE_NAMES_HIGH_TO_LOW,
  SCALE_MODE_GROUPS,
  SCALE_MODE_OPTIONS,
  SCALE_MODE_SEMITONES,
  START_TONE_GROUPS,
  START_TONE_OPTIONS,
}
export type {
  ChromaticDisplayNote,
  MidiNoteLabel,
  ScaleMode,
  ScaleModeGroup,
  ScaleModeOption,
  ScaleNote,
  StartToneGroup,
  StartToneOption,
  VoiceTier,
}
