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

/* Outlier sheets: notehead placements possible on each clef beyond the basic
 * covered range above, drawn with ledger lines for reference. Each clef shows a
 * low and a high cluster of ledger-line notes. Middle C (C4) is deliberately
 * excluded — it's the shared boundary of the two basic clefs, so the outlier
 * clusters sit strictly beyond it on each side. */
export const TREBLE_OUTLIER_LOW_MIN_MIDI = 50 // D3
export const TREBLE_OUTLIER_LOW_MAX_MIDI = 59 // B3 — stops one semitone below middle C (C4)
export const TREBLE_OUTLIER_HIGH_MIN_MIDI = 82 // A#5 — starts one semitone above the basic treble top (A5)
export const TREBLE_OUTLIER_HIGH_MAX_MIDI = 91 // G6

export const BASS_OUTLIER_LOW_MIN_MIDI = 29 // F1
export const BASS_OUTLIER_LOW_MAX_MIDI = 39 // D#2 — stops one semitone below the basic bass bottom (E2)
export const BASS_OUTLIER_HIGH_MIN_MIDI = 61 // C#4 — starts one semitone above middle C (C4)
export const BASS_OUTLIER_HIGH_MAX_MIDI = 71 // B4
