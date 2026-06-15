/* Tempo list for the /notes player. BPM = quarter note (the 4/4 beat unit) —
 * note this differs from Grace Kelly, where BPM is a dotted quarter (6/8).
 * Shared by the page (persistence/validation) and the settings row (the tempo
 * dropdown) so the two can't drift out of sync. "BPM" kept untranslated. */
export const ALLOWED_BPMS = [
  80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200,
] as const
export const DEFAULT_BPM = 100

/* The two sheets, by index. The clef select (the old Grace Kelly "Part"
 * dropdown) picks one; the index maps into NOTE_SCALES and the i18n labels at
 * notes.clefLabels.<key>. */
export const CLEF_LABEL_KEYS = ['treble', 'bass'] as const
export type ClefKey = (typeof CLEF_LABEL_KEYS)[number]

/* G clef (treble) sheet: chromatic middle C (C4) up to A5. */
export const TREBLE_MIN_MIDI = 60 // C4
export const TREBLE_MAX_MIDI = 81 // A5

/* Bass clef sheet: chromatic E2 up to middle C (C4). */
export const BASS_MIN_MIDI = 40 // E2
export const BASS_MAX_MIDI = 60 // C4
