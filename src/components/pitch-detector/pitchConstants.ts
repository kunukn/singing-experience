/* Silence longer than this between samples is treated as a singing pause */
export const PAUSE_GAP_MS = 250

/* Visible time width of the pitch chart in milliseconds. */
export const HISTORY_WINDOW_MS = 5000

/* How much pitch history we retain in memory for replay. */
export const HISTORY_RETENTION_MS = 30000

/*
 * ¢ — the focus tab's "On pitch" band and score. Tighter than the colour
 * scale's CLOSE_CENTS (25¢): trained singers hold sustained notes within
 * about 10–20¢, and untrained adults already average about 25¢ on familiar
 * songs, so 20¢ marks a lead-singer standard rather than an everyday one.
 */
export const ON_PITCH_CENTS = 20
