/* Silence longer than this between samples is treated as a singing pause */
export const PAUSE_GAP_MS = 250

/* Visible time width of the pitch chart in milliseconds. */
export const HISTORY_WINDOW_MS = 5000

/*
 * How much pitch history we retain for replay. 2 min costs under 1 MB of memory
 * at 60 samples a second. The chart only draws what's visible, so this doesn't
 * affect frame rate. Change the "replaySound" label in every locale with it.
 */
export const HISTORY_RETENTION_MS = 120000
