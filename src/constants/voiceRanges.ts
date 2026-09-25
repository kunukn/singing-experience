export type VoiceRangeGroupId = 'easy' | 'voiceTypes' | 'wide'

export type VoiceRange = {
  labelKey: string
  noteRange: string
  midiMin: number
  midiMax: number
  group: VoiceRangeGroupId
  /*
   * labelKeys of the voice types this range is named after. When present the
   * voice-type ribbon shows exactly these, instead of judging each voice by how
   * much of it is on screen — C3–C6 genuinely contains all six voices, but a
   * range called Tenor–Soprano should not say so. Ranges without it fall back
   * to the coverage test in voiceRangeSegments.ts.
   */
  focusVoices?: readonly string[]
}

/* Display order of the option groups in the voice-range select. */
export const VOICE_RANGE_GROUP_ORDER = [
  'easy',
  'voiceTypes',
  'wide',
] as const satisfies readonly VoiceRangeGroupId[]

/*
 * Ordered for the select: everyday picks, then the classical voice types, then
 * the wide spans. Within every group the options run high to low, matching the
 * chart's y-axis — see "Pitch Orientation" in AGENTS.md. A range sorts on its
 * midpoint, since a span has no single pitch; the catch-alls (choir, full) sit
 * below the pitch-ordered entries. Guarded by voiceRanges.test.ts.
 *
 * Reordering is safe — selections are persisted by labelKey, not index (see
 * useVoiceRangeIndex).
 */
export const VOICE_RANGES: VoiceRange[] = [
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
    labelKey: 'voiceRanges.everyone',
    noteRange: 'G3–G4',
    midiMin: 55,
    midiMax: 67,
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
    labelKey: 'voiceRanges.comfyMen',
    noteRange: 'C3–C4',
    midiMin: 48,
    midiMax: 60,
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
  /* Wide ranges, high to low by midpoint, with the two catch-alls last. The
   * pairs named after voices carry focusVoices; the plain spans let the
   * coverage rule decide what the ribbon shows. */
  {
    labelKey: 'voiceRanges.highVoices',
    noteRange: 'C4–C6',
    midiMin: 60,
    midiMax: 84,
    group: 'wide',
  },
  /* C3–C6 is the union of Tenor (C3–C5) and Soprano (C4–C6). Alto and
   * Mezzo-Soprano sit whole inside it, so they are named too — a focus list is
   * the run of voices from one end of the name to the other. Baritone is not on
   * it: C3–C6 covers seven eighths of it, enough to pass the coverage test, but
   * a bar below Tenor would contradict a range called Tenor–Soprano. */
  {
    labelKey: 'voiceRanges.tenorToSoprano',
    noteRange: 'C3–C6',
    midiMin: 48,
    midiMax: 84,
    group: 'wide',
    focusVoices: [
      'voiceRanges.tenor',
      'voiceRanges.alto',
      'voiceRanges.mezzoSoprano',
      'voiceRanges.soprano',
    ],
  },
  /* A2–C5 is the union of Baritone (A2–A4) and Tenor (C3–C5) — the middle of
   * the voice stack, between the Bass–Baritone and Tenor–Soprano pairs. The two
   * are neighbours, so nothing sits between them to name. */
  {
    labelKey: 'voiceRanges.baritoneToTenor',
    noteRange: 'A2–C5',
    midiMin: 45,
    midiMax: 72,
    group: 'wide',
    focusVoices: ['voiceRanges.baritone', 'voiceRanges.tenor'],
  },
  /* E2–C5 is the union of Bass (E2–E4) and Tenor (C3–C5). Baritone sits whole
   * between them, so it is named too — a focus list is the run from one end of
   * the name to the other. Alto is not on it: E2–C5 covers most of it, but a
   * bar above Tenor would contradict a range called Bass–Tenor. */
  {
    labelKey: 'voiceRanges.bassToTenor',
    noteRange: 'E2–C5',
    midiMin: 40,
    midiMax: 72,
    group: 'wide',
    focusVoices: [
      'voiceRanges.bass',
      'voiceRanges.baritone',
      'voiceRanges.tenor',
    ],
  },
  /* E2–A4 is the union of Bass (E2–E4) and Baritone (A2–A4). It reaches well
   * into Tenor and Alto too, hence the focus list. */
  {
    labelKey: 'voiceRanges.bassToBaritone',
    noteRange: 'E2–A4',
    midiMin: 40,
    midiMax: 69,
    group: 'wide',
    focusVoices: ['voiceRanges.bass', 'voiceRanges.baritone'],
  },
  {
    labelKey: 'voiceRanges.lowVoices',
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
