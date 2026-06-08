/* Canonical tempo list for the Grace Kelly game. BPM = dotted quarter (the 6/8
 * beat unit). Shared by the page (persistence/validation) and the display (the
 * tempo dropdown) so the two can't drift out of sync. "BPM" kept untranslated. */
export const ALLOWED_BPMS = [50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150]
export const DEFAULT_BPM = 120

/* Start-tone range for the Grace Kelly game, C2 (MIDI 36) – C3 (MIDI 48).
 * Capped at C3 because higher start tones push the high voices (Voz 2 peaks an
 * octave-plus above the tonic) into an unsingable register. Shared by the page
 * (persistence/validation) and the display (the start-tone dropdown) so the two
 * can't drift out of sync. */
export const START_TONE_MIDI_MIN = 36 // C2
export const START_TONE_MIDI_MAX = 48 // C3

/* Descriptive part labels, ordered by VOZ_MELODIES index. "MIKA" is the artist
 * name (Grace Kelly is a MIKA song) and stays untranslated. Shared by the
 * settings row (the Voz dropdown) and the display (current/overview labels). */
export const VOZ_LABEL_KEYS = [
  'lead',
  'reallyHigh',
  'high',
  'oneTone',
  'lessLow',
  'low',
] as const
