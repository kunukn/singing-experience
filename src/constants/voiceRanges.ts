export type VoiceRangeGroupId = 'easy' | 'voiceTypes' | 'wide'

export type VoiceRange = {
  labelKey: string
  noteRange: string
  midiMin: number
  midiMax: number
  group: VoiceRangeGroupId
}

/* Display order of the option groups in the voice-range select. */
export const VOICE_RANGE_GROUP_ORDER = [
  'easy',
  'voiceTypes',
  'wide',
] as const satisfies readonly VoiceRangeGroupId[]

/*
 * Ordered for the select: everyday picks first, then the classical voice types
 * from high to low, then the wide spans. Reordering is safe — selections are
 * persisted by labelKey (see useVoiceRangeIndex).
 */
export const VOICE_RANGES: VoiceRange[] = [
  {
    labelKey: 'voiceRanges.everyone',
    noteRange: 'G3–G4',
    midiMin: 55,
    midiMax: 67,
    group: 'easy',
  },
  {
    labelKey: 'voiceRanges.kids',
    noteRange: 'D4–D5',
    midiMin: 62,
    midiMax: 74,
    group: 'easy',
  },
  {
    labelKey: 'voiceRanges.comfyWomen',
    noteRange: 'C4–C5',
    midiMin: 60,
    midiMax: 72,
    group: 'easy',
  },
  {
    labelKey: 'voiceRanges.comfyMen',
    noteRange: 'C3–C4',
    midiMin: 48,
    midiMax: 60,
    group: 'easy',
  },
  /* Union of comfyMen (C3–C4) and comfyWomen (C4–C5) — the two octaves a man
   * and a woman land on when they sing the same melody together. Shares its
   * MIDI span with `tenor`, but nobody looking for a duet would pick that. */
  {
    labelKey: 'voiceRanges.duet',
    noteRange: 'C3–C5',
    midiMin: 48,
    midiMax: 72,
    group: 'easy',
  },
  {
    labelKey: 'voiceRanges.soprano',
    noteRange: 'C4–C6',
    midiMin: 60,
    midiMax: 84,
    group: 'voiceTypes',
  },
  {
    labelKey: 'voiceRanges.mezzoSoprano',
    noteRange: 'A3–A5',
    midiMin: 57,
    midiMax: 81,
    group: 'voiceTypes',
  },
  {
    labelKey: 'voiceRanges.alto',
    noteRange: 'F3–F5',
    midiMin: 53,
    midiMax: 77,
    group: 'voiceTypes',
  },
  {
    labelKey: 'voiceRanges.tenor',
    noteRange: 'C3–C5',
    midiMin: 48,
    midiMax: 72,
    group: 'voiceTypes',
  },
  {
    labelKey: 'voiceRanges.baritone',
    noteRange: 'A2–A4',
    midiMin: 45,
    midiMax: 69,
    group: 'voiceTypes',
  },
  {
    labelKey: 'voiceRanges.bass',
    noteRange: 'E2–E4',
    midiMin: 40,
    midiMax: 64,
    group: 'voiceTypes',
  },
  {
    labelKey: 'voiceRanges.tenorToSoprano',
    noteRange: 'C3–C6',
    midiMin: 48,
    midiMax: 84,
    group: 'wide',
  },
  {
    labelKey: 'voiceRanges.bassToBaritone',
    noteRange: 'C2–C4',
    midiMin: 36,
    midiMax: 60,
    group: 'wide',
  },
  {
    labelKey: 'voiceRanges.choir',
    noteRange: 'E2–C6',
    midiMin: 40,
    midiMax: 84,
    group: 'wide',
  },
  {
    labelKey: 'voiceRanges.full',
    noteRange: 'C2–C7',
    midiMin: 36,
    midiMax: 96,
    group: 'wide',
  },
]

/* Resolve by labelKey so the default survives reordering of VOICE_RANGES */
export const DEFAULT_RANGE_INDEX = VOICE_RANGES.findIndex(
  (range) => range.labelKey === 'voiceRanges.everyone',
)
