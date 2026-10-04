import type { NoteEvent } from './noteSegmenter'

/* A note or rest snapped to the rhythm grid. Units are grid steps (an eighth
 * at grid 8, a sixteenth at grid 16) counted from beat 1 of bar 1. */
export type QuantizedNote = {
  /* null = rest */
  midi: number | null
  startUnit: number
  units: number
}

export type QuantizeOptions = {
  bpm: number
  /* Note-value denominator of one grid step: 8 = eighths, 16 = sixteenths. */
  grid: number
  beatsPerBar: number
}

/* Milliseconds per grid step. A whole note spans four quarter-note beats
 * (4 × 60 000 / bpm ms); one grid step is 1/grid of that. */
export function gridUnitMs(bpm: number, grid: number): number {
  return 240_000 / (bpm * grid)
}

/* Grid steps in one bar: beats × steps per quarter-note beat. */
export function unitsPerBar(grid: number, beatsPerBar: number): number {
  return beatsPerBar * (grid / 4)
}

/* Singers release notes early (a breath before the next note) far more often
 * than they hold them long, and the breath grows with the note — so a note's
 * end is nudged later by a share of its own length before rounding. Without it
 * a half note released a beat-fraction early reads as a dotted quarter plus an
 * eighth rest. The bias is in grid steps: at least 0.15 (round up from 35% into
 * a step), at most 0.45 (never a plain ceil, so real rests survive). */
const EARLY_RELEASE_SHARE = 0.2
const MIN_END_BIAS = 0.15
const MAX_END_BIAS = 0.45

function endBias(durationUnits: number): number {
  return Math.min(
    MAX_END_BIAS,
    Math.max(MIN_END_BIAS, durationUnits * EARLY_RELEASE_SHARE),
  )
}

/*
 * Snaps each note's start and end to the nearest grid step independently, so a
 * note's length follows where the singer actually started and stopped rather
 * than accumulating rounding error. Overlaps after snapping are resolved by
 * pushing the later note's start forward; gaps become rests; the last note's
 * bar is padded with a rest so every bar is full. Silence after the last note
 * is dropped — empty trailing bars say nothing.
 */
export function quantizeNotes(
  events: readonly NoteEvent[],
  options: QuantizeOptions,
): QuantizedNote[] {
  const unitMs = gridUnitMs(options.bpm, options.grid)
  const barUnits = unitsPerBar(options.grid, options.beatsPerBar)
  const result: QuantizedNote[] = []
  let cursor = 0

  const sorted = [...events].sort((a, b) => a.startMs - b.startMs)
  for (const event of sorted) {
    const start = Math.max(cursor, Math.round(event.startMs / unitMs))
    const durationUnits = (event.endMs - event.startMs) / unitMs
    let end = Math.round(event.endMs / unitMs + endBias(durationUnits))

    /* Shorter than one step after rounding: keep it as a single step if it
     * lasted at least half a step, otherwise it's too short for this grid. */
    if (end <= start) {
      if (event.endMs - event.startMs < unitMs / 2) continue

      end = start + 1
    }

    if (start > cursor) {
      result.push({ midi: null, startUnit: cursor, units: start - cursor })
    }

    result.push({ midi: event.midi, startUnit: start, units: end - start })
    cursor = end
  }

  const paddedEnd = Math.ceil(cursor / barUnits) * barUnits

  if (paddedEnd > cursor) {
    result.push({ midi: null, startUnit: cursor, units: paddedEnd - cursor })
  }

  return result
}
