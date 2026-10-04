/* Tempo list for the song recorder. BPM = quarter note (the 4/4 beat unit).
 * Starts lower than /notes (50) so slow ballads fit. "BPM" kept untranslated. */
export const ALLOWED_BPMS = [
  50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160,
] as const
export const DEFAULT_BPM = 90

/* Hard cap on one take. Recording auto-stops at the last full bar that fits. */
export const MAX_RECORDING_SECONDS = 60

/* One bar of clicks before recording starts, so the singer locks onto the tempo
 * and the first sung note lands on beat 1 of bar 1. */
export const COUNT_IN_BARS = 1

/* 4/4 only for now; every pure helper takes beatsPerBar so 3/4 and 5/4 are a
 * config change later. */
export const BEATS_PER_BAR = 4

/* Rhythm grid as the note-value denominator: 8 = eighth notes, 16 = sixteenths.
 * Eighths absorb normal sung timing jitter (~±80 ms); sixteenths are for
 * precise input. Listed finest first (largest count at the top). */
export const GRID_OPTIONS = [16, 8] as const
export type Grid = (typeof GRID_OPTIONS)[number]
export const DEFAULT_GRID: Grid = 8

/* Segmenter tuning — see noteSegmenter.ts for how each one is used. */

/* A silence at least this long ends a note. Shorter dropouts (a detector
 * glitch) are bridged; consonants between repeated syllables ("la la") are
 * usually longer, so they split. */
export const MIN_GAP_MS = 60

/* A new semitone must hold this long before it counts as a new note, so
 * vibrato, glides and brief octave errors don't chop a note up. */
export const PITCH_CHANGE_HOLD_MS = 80

/* Segments shorter than this are blips, not notes. */
export const MIN_NOTE_MS = 80

/* Detection reports a note's start late: the 2048-sample analyser window
 * (~45 ms) plus the 40 ms onset debounce in usePitchDetection. Shifting starts
 * back by roughly that keeps onsets on the beat the singer actually hit. */
export const ONSET_LATENCY_MS = 60

/* Silence and pitch changes have no debounce — only about half the analyser
 * window — so note ends and pitch-change boundaries shift back less. */
export const RELEASE_LATENCY_MS = 20

/* Fraction of a note ignored at its start (scoop up into the pitch) and end
 * (release/fall-off) when picking the note's pitch. */
export const PITCH_TRIM_HEAD = 0.15
export const PITCH_TRIM_TAIL = 0.1
