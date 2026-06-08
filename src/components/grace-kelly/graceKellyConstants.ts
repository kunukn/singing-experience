/* Canonical tempo list for the Grace Kelly game. BPM = dotted quarter (the 6/8
 * beat unit). Shared by the page (persistence/validation) and the display (the
 * tempo dropdown) so the two can't drift out of sync. "BPM" kept untranslated. */
export const ALLOWED_BPMS = [50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150]
export const DEFAULT_BPM = 100
