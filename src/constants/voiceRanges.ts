export type VoiceRange = {
  labelKey: string
  noteRange: string
  midiMin: number
  midiMax: number
}

export const VOICE_RANGES: VoiceRange[] = [
  {
    labelKey: 'voiceRanges.full',
    noteRange: 'C2–C7',
    midiMin: 36,
    midiMax: 96,
  },
  {
    labelKey: 'voiceRanges.choir',
    noteRange: 'E2–C6',
    midiMin: 40,
    midiMax: 84,
  },
  {
    labelKey: 'voiceRanges.tenorToSoprano',
    noteRange: 'C3–C6',
    midiMin: 48,
    midiMax: 84,
  },
  {
    labelKey: 'voiceRanges.soprano',
    noteRange: 'C4–C6',
    midiMin: 60,
    midiMax: 84,
  },
  {
    labelKey: 'voiceRanges.mezzoSoprano',
    noteRange: 'A3–A5',
    midiMin: 57,
    midiMax: 81,
  },
  {
    labelKey: 'voiceRanges.alto',
    noteRange: 'F3–F5',
    midiMin: 53,
    midiMax: 77,
  },
  {
    labelKey: 'voiceRanges.tenor',
    noteRange: 'C3–C5',
    midiMin: 48,
    midiMax: 72,
  },
  {
    labelKey: 'voiceRanges.baritone',
    noteRange: 'A2–A4',
    midiMin: 45,
    midiMax: 69,
  },
  {
    labelKey: 'voiceRanges.bass',
    noteRange: 'E2–E4',
    midiMin: 40,
    midiMax: 64,
  },
  {
    labelKey: 'voiceRanges.bassToBaritone',
    noteRange: 'C2–C4',
    midiMin: 36,
    midiMax: 60,
  },
  /* Union of comfyMen (C3–C4) and comfyWomen (C4–C5) — the two octaves a man
   * and a woman land on when they sing the same melody together. Shares its
   * MIDI span with `tenor`, but nobody looking for a duet would pick that. */
  {
    labelKey: 'voiceRanges.duet',
    noteRange: 'C3–C5',
    midiMin: 48,
    midiMax: 72,
  },
  {
    labelKey: 'voiceRanges.kids',
    noteRange: 'D4–D5',
    midiMin: 62,
    midiMax: 74,
  },
  {
    labelKey: 'voiceRanges.comfyWomen',
    noteRange: 'C4–C5',
    midiMin: 60,
    midiMax: 72,
  },
  {
    labelKey: 'voiceRanges.everyone',
    noteRange: 'G3–G4',
    midiMin: 55,
    midiMax: 67,
  },
  {
    labelKey: 'voiceRanges.comfyMen',
    noteRange: 'C3–C4',
    midiMin: 48,
    midiMax: 60,
  },
]

/* Resolve by labelKey so the default survives reordering of VOICE_RANGES */
export const DEFAULT_RANGE_INDEX = VOICE_RANGES.findIndex(
  (range) => range.labelKey === 'voiceRanges.everyone',
)
