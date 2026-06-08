/* Canonical tempo list for the Grace Kelly game. BPM = dotted quarter (the 6/8
 * beat unit). Shared by the page (persistence/validation) and the display (the
 * tempo dropdown) so the two can't drift out of sync. "BPM" kept untranslated. */
export const ALLOWED_BPMS = [50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150]
export const DEFAULT_BPM = 100

/* Start-tone range for the Grace Kelly game, C2 (MIDI 36) – B3 (MIDI 59).
 * Shared by the page (persistence/validation) and the display (the start-tone
 * dropdown) so the two can't drift out of sync. */
export const START_TONE_MIDI_MIN = 36 // C2
export const START_TONE_MIDI_MAX = 59 // B3
