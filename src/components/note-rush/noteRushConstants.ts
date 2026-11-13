/* Silence longer than this between samples is treated as a singing pause */
export const PAUSE_GAP_MS = 250

/* Visible time width of the pitch chart in milliseconds. */
export const HISTORY_WINDOW_MS = 5000

/* How much pitch history we retain in memory for replay. */
export const HISTORY_RETENTION_MS = 30000

/* Position of the game pickup line, as a fraction of the visible chart width
 * measured from the label-axis side toward the live edge. Capture happens on
 * the label-axis side of this line; the remaining (1 - ratio) is the approach
 * zone on the live-edge side. 0.75 means a long capture window and a short
 * approach, giving the player more time to catch each incoming note. */
export const GAME_PICKUP_LINE_RATIO = 0.75
