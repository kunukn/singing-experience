import { circularMeanCents, median, slopePerIndex } from './takeStats'

/* Half of a 250 ms window at 20 ms a frame. Centred, so a held octave leap flips
 * the median exactly at the leap and only shorter glitches get folded. */
const OCTAVE_MEDIAN_HALF_FRAMES = 6
/* How close a frame must be to a whole-octave jump to count as a detector error. */
const OCTAVE_TOLERANCE_SEMITONES = 1
const OCTAVE_JUMPS = [24, 12, -12, -24]

/* Frames moving faster than this are passing between notes, not sitting on one.
 * 0.4 st per 20 ms frame still admits ±50¢ vibrato at 5.5 Hz. */
const STABLE_FRAME_MAX_STEP = 0.4

/* 200 ms at 20 ms a frame: one vibrato cycle at the slow end of singers' 5–7 Hz. */
const OFFSET_AVERAGE_FRAMES = 10
/* Wide enough for ±75¢ vibrato, too narrow to span two different notes. */
const OFFSET_MAX_SPAN_SEMITONES = 1.5

const TUNING_WINDOW_MS = 20_000
const TUNING_STEP_MS = 5000
/* Fewer notes than this and a window would tune to its own mistakes, flattering
 * a singer who held one wrong note. */
const TUNING_WINDOW_MIN_NOTES = 12

export type TuningNote = { startMs: number; endMs: number; centerMidi: number }

export type TuningCurve = {
  /* The take's overall distance from A=440, in [-50, 50). */
  offsetCents: number
  /* How far the singer's own tuning moved from start to end of the take. */
  driftCents: number
  offsetAt: (timeMs: number) => number
}

/*
 * Pitch detectors sometimes report a harmonic or subharmonic for a few frames.
 * Those show up as a brief jump of a whole octave, so fold them back. NaN marks
 * an unvoiced frame.
 */
export function foldOctaveGlitches(midi: Float32Array): Float32Array {
  const folded = Float32Array.from(midi)

  for (let i = 0; i < midi.length; i++) {
    if (Number.isNaN(midi[i])) continue

    const neighbours: number[] = []
    const from = Math.max(0, i - OCTAVE_MEDIAN_HALF_FRAMES)
    const to = Math.min(midi.length - 1, i + OCTAVE_MEDIAN_HALF_FRAMES)
    for (let j = from; j <= to; j++) {
      if (!Number.isNaN(midi[j])) neighbours.push(midi[j])
    }

    const local = median(neighbours)
    const jump = OCTAVE_JUMPS.find(
      (octaves) =>
        Math.abs(midi[i] - local - octaves) <= OCTAVE_TOLERANCE_SEMITONES,
    )
    if (jump !== undefined) folded[i] = midi[i] - jump
  }

  return folded
}

function centsFromNearestSemitone(midi: number): number {
  return (midi - Math.round(midi)) * 100
}

/*
 * The take's overall tuning. Averages over a vibrato cycle first: ±50¢ vibrato
 * spends most of its time at both extremes, which are the same point on a 100¢
 * circle, so raw frames would put the tuning a full 50¢ off. Short notes never
 * fill that window, so they fall back to single steady frames.
 */
export function estimateOffsetCents(midi: Float32Array): number {
  const averaged: number[] = []
  const steadyFrames: number[] = []

  for (let i = 1; i < midi.length; i++) {
    if (Number.isNaN(midi[i]) || Number.isNaN(midi[i - 1])) continue

    if (Math.abs(midi[i] - midi[i - 1]) <= STABLE_FRAME_MAX_STEP) {
      steadyFrames.push(centsFromNearestSemitone(midi[i]))
    }

    if (i < OFFSET_AVERAGE_FRAMES - 1) continue

    let total = 0
    let lowest = Infinity
    let highest = -Infinity
    for (let j = i - OFFSET_AVERAGE_FRAMES + 1; j <= i; j++) {
      total += midi[j]
      lowest = Math.min(lowest, midi[j])
      highest = Math.max(highest, midi[j])
    }

    /* NaN from an unvoiced frame fails this comparison too. */
    if (highest - lowest <= OFFSET_MAX_SPAN_SEMITONES) {
      averaged.push(centsFromNearestSemitone(total / OFFSET_AVERAGE_FRAMES))
    }
  }

  return circularMeanCents(averaged.length > 0 ? averaged : steadyFrames)
}

/*
 * Singing with no backing track, a voice drifts, and that shouldn't turn every
 * later note "out of tune". This tracks the singer's own tuning across the take
 * from a first pass of notes. Sparse stretches fall back to the overall tuning.
 */
export function estimateTuningCurve(
  notes: TuningNote[],
  durationMs: number,
  overallOffsetCents: number,
): TuningCurve {
  const timesMs: number[] = []
  const offsets: number[] = []
  let previous = overallOffsetCents

  for (let timeMs = 0; timeMs <= durationMs; timeMs += TUNING_STEP_MS) {
    const inWindow = notes.filter(
      (note) =>
        note.endMs >= timeMs - TUNING_WINDOW_MS / 2 &&
        note.startMs <= timeMs + TUNING_WINDOW_MS / 2,
    )
    if (inWindow.length < TUNING_WINDOW_MIN_NOTES) continue

    const circular = circularMeanCents(
      inWindow.map((note) => centsFromNearestSemitone(note.centerMidi)),
      inWindow.map((note) => note.endMs - note.startMs),
    )
    /* Unwrap: a drift past 50¢ continues rather than jumping to the other side. */
    const unwrapped = circular + 100 * Math.round((previous - circular) / 100)
    const noteTimes = inWindow.map((note) => (note.startMs + note.endMs) / 2)

    /* Windows clip at the edges of the take, so each value is placed at the
     * middle of its actual notes rather than at the window centre. */
    timesMs.push(
      noteTimes.reduce((sum, time) => sum + time, 0) / noteTimes.length,
    )
    offsets.push(unwrapped)
    previous = unwrapped
  }

  if (offsets.length === 0) {
    return {
      offsetCents: overallOffsetCents,
      driftCents: 0,
      offsetAt: () => overallOffsetCents,
    }
  }

  function offsetAt(timeMs: number): number {
    if (timeMs <= timesMs[0]) return offsets[0]
    if (timeMs >= timesMs[timesMs.length - 1])
      return offsets[offsets.length - 1]

    const after = timesMs.findIndex((time) => time >= timeMs)
    const span = timesMs[after] - timesMs[after - 1]
    const progress = span > 0 ? (timeMs - timesMs[after - 1]) / span : 0

    return offsets[after - 1] + (offsets[after] - offsets[after - 1]) * progress
  }

  return {
    offsetCents: overallOffsetCents,
    driftCents: fitDriftCents(timesMs, offsets, durationMs),
    offsetAt,
  }
}

/* A fitted line rather than last minus first: the endpoints are window averages,
 * which understate the real movement. */
function fitDriftCents(
  timesMs: number[],
  offsets: number[],
  durationMs: number,
): number {
  if (offsets.length < 2) return 0

  const averageStepMs =
    (timesMs[timesMs.length - 1] - timesMs[0]) / (timesMs.length - 1)
  if (averageStepMs <= 0) return 0

  return (slopePerIndex(offsets) / averageStepMs) * durationMs
}
