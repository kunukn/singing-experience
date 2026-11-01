/* Interval between consecutive strings in the tuning preview sequence (ms).
 * Shared across instrument tuners so the preview cadence stays consistent. */
export const PREVIEW_INTERVAL_MS = 400

/* A string counts as in tune within this many cents: green ring and bell.
 * Tighter than CLEAN_CENTS (singing), matching clip-on guitar tuners; the
 * CLEAN_CENTS band becomes the pale-green "almost" tier. */
export const TUNER_IN_TUNE_CENTS = 3
