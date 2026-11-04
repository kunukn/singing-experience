import type { NoteEvent } from '@/components/song-recorder/noteSegmenter'
import {
  PITCH_TRIM_HEAD,
  PITCH_TRIM_TAIL,
} from '@/components/song-recorder/songRecorderConstants'

import { CLOSE_CENTS } from '@/utils/pitchColors'

import { mean, median, percentile, slopePerIndex } from './takeStats'

/* Too short to show a stable centre, and held notes are what steadiness means. */
const STEADINESS_MIN_NOTE_MS = 400
/* Needs at least two vibrato cycles at the slowest rate after trimming. */
const VIBRATO_MIN_NOTE_MS = 500
/* Singers' vibrato sits around 5–7 Hz; these bounds leave room either side. */
const VIBRATO_MIN_HZ = 4
const VIBRATO_MAX_HZ = 8
const VIBRATO_MIN_CORRELATION = 0.4
/* Peak to peak. Under this it's jitter, over it it's not one held note. */
const VIBRATO_MIN_EXTENT_CENTS = 30
const VIBRATO_MAX_EXTENT_CENTS = 200

/* A slide is fast and heads one way. Direction matters because vibrato also has
 * a steep slope over a single cycle. */
const GLIDE_MIN_SLOPE_CENTS_PER_SECOND = 300
const GLIDE_MIN_DIRECTION_SHARE = 0.7

/* How soon a note must reach its centre for a clean start. */
const CLEAN_START_MS = 120
/* A slide only joins a note it runs straight into, and only over a small step:
 * anything wider is a real interval sung legato. */
const SLIDE_JOIN_MAX_GAP_MS = 60
const SLIDE_MAX_SEMITONES = 4

/* Matches the rolling mean in focusToneTracker.ts: long enough to average out a
 * vibrato cycle, short enough to keep slower wander. */
const DEFAULT_SMOOTHING_MS = 200

export type TakeVibrato = { rateHz: number; extentCents: number }

export type TakeNote = NoteEvent & {
  /* Median pitch relative to the singer's tuning, in fractional semitones. */
  centerMidi: number
  /* Distance of that centre from the note: 0 is dead centre. */
  centsFromGrid: number
  /* A slide that joined no neighbour; left out of the rating. */
  isGlide: boolean
  /* Reached its pitch by sliding up or down from a nearby one. */
  hasSlideIn: boolean
  /* Reached its centre within CLEAN_START_MS. */
  hasCleanStart: boolean
  /* Slow wander in cents, with any vibrato removed; null on short notes. */
  wobbleCents: number | null
  vibrato: TakeVibrato | null
}

function detectVibrato(cents: Float32Array, hopMs: number): TakeVibrato | null {
  const lowestLag = Math.floor(1000 / VIBRATO_MAX_HZ / hopMs)
  const highestLag = Math.ceil(1000 / VIBRATO_MIN_HZ / hopMs)
  if (cents.length < highestLag + 2) return null

  /* Take out any slow slope so it doesn't read as periodicity. */
  const slope = slopePerIndex(cents)
  const centre = mean(cents)
  const middleIndex = (cents.length - 1) / 2
  const detrended = cents.map(
    (value, index) => value - centre - slope * (index - middleIndex),
  )

  const correlationAt = (lag: number) => {
    let shared = 0
    let energyA = 0
    let energyB = 0
    for (let i = 0; i + lag < detrended.length; i++) {
      shared += detrended[i] * detrended[i + lag]
      energyA += detrended[i] * detrended[i]
      energyB += detrended[i + lag] * detrended[i + lag]
    }
    const scale = Math.sqrt(energyA * energyB)

    return scale > 0 ? shared / scale : 0
  }

  let bestLag = 0
  let bestCorrelation = -1
  for (let lag = lowestLag; lag <= highestLag; lag++) {
    const correlation = correlationAt(lag)
    if (correlation > bestCorrelation) {
      bestCorrelation = correlation
      bestLag = lag
    }
  }

  if (bestLag === 0 || bestCorrelation < VIBRATO_MIN_CORRELATION) return null

  const extentCents = percentile(detrended, 0.95) - percentile(detrended, 0.05)
  if (
    extentCents < VIBRATO_MIN_EXTENT_CENTS ||
    extentCents > VIBRATO_MAX_EXTENT_CENTS
  ) {
    return null
  }

  /* Parabolic peak: at 20 ms a frame, whole lags are about 0.6 Hz apart. */
  const before = correlationAt(bestLag - 1)
  const after = correlationAt(bestLag + 1)
  const curvature = before - 2 * bestCorrelation + after
  const refinedLag =
    curvature < 0 ? bestLag + (0.5 * (before - after)) / curvature : bestLag

  return { rateHz: 1000 / (refinedLag * hopMs), extentCents }
}

/* 1 for sliding up, -1 for sliding down, 0 for holding. */
function slideDirection(cents: Float32Array, hopMs: number): number {
  const slopePerSecond = (slopePerIndex(cents) / hopMs) * 1000
  if (Math.abs(slopePerSecond) < GLIDE_MIN_SLOPE_CENTS_PER_SECOND) return 0

  let sameDirection = 0
  for (let i = 1; i < cents.length; i++) {
    if ((cents[i] - cents[i - 1]) * slopePerSecond > 0) sameDirection++
  }

  return sameDirection / (cents.length - 1) >= GLIDE_MIN_DIRECTION_SHARE
    ? Math.sign(slopePerSecond)
    : 0
}

function measureWobble(
  cents: Float32Array,
  hopMs: number,
  vibrato: TakeVibrato | null,
): number {
  const smoothingMs = vibrato ? 1000 / vibrato.rateHz : DEFAULT_SMOOTHING_MS
  const size = Math.min(cents.length, Math.round(smoothingMs / hopMs))
  const smoothed: number[] = []
  let total = 0

  for (let i = 0; i < cents.length; i++) {
    total += cents[i]
    if (i >= size) total -= cents[i - size]
    if (i >= size - 1) smoothed.push(total / size)
  }

  const centre = mean(smoothed)
  const variance = mean(smoothed.map((value) => (value - centre) ** 2))

  return Math.sqrt(variance)
}

type SegmentedNote = NoteEvent & { hasSlideIn?: boolean }

/*
 * A slide crosses semitones, so the segmenter reports each one it holds long
 * enough as its own note. Fold those back into the note the singer was heading
 * for, or the fall-off from the one they left. Otherwise a scoop reads as extra
 * notes, some of them outside the key.
 */
function mergeSlides(
  notes: (TakeNote & { direction: number })[],
): SegmentedNote[] {
  const merged: SegmentedNote[] = []

  for (let i = notes.length - 1; i >= 0; i--) {
    const note = notes[i]
    const next = merged[0]
    const isHeadingIntoNext =
      note.direction !== 0 &&
      next !== undefined &&
      next.startMs - note.endMs <= SLIDE_JOIN_MAX_GAP_MS &&
      Math.abs(next.midi - note.midi) <= SLIDE_MAX_SEMITONES &&
      Math.sign(next.midi - note.midi) === note.direction

    if (isHeadingIntoNext) {
      next.startMs = note.startMs
      next.hasSlideIn = true
    } else {
      merged.unshift({
        startMs: note.startMs,
        endMs: note.endMs,
        midi: note.midi,
        hasSlideIn: note.hasSlideIn,
      })
    }
  }

  const withFalls: SegmentedNote[] = []
  for (const note of merged) {
    const previous = withFalls[withFalls.length - 1]
    const source = notes.find((item) => item.startMs === note.startMs)
    const isFallingOff =
      source !== undefined &&
      source.direction !== 0 &&
      !note.hasSlideIn &&
      previous !== undefined &&
      note.startMs - previous.endMs <= SLIDE_JOIN_MAX_GAP_MS &&
      Math.abs(note.midi - previous.midi) <= SLIDE_MAX_SEMITONES &&
      Math.sign(note.midi - previous.midi) === source.direction

    if (isFallingOff) {
      previous.endMs = note.endMs
    } else {
      withFalls.push(note)
    }
  }

  return withFalls
}

/*
 * Adds what the segmenter's rounded note drops: exact centre, steadiness and
 * vibrato. Works on tuned pitch, so a singer's own tuning reads as centred.
 */
export function buildTakeNotes(
  events: NoteEvent[],
  tunedMidi: Float32Array,
  hopMs: number,
  frameIndexAt: (timeMs: number) => number,
): TakeNote[] {
  function measure(event: SegmentedNote) {
    const span = event.endMs - event.startMs
    const firstFrame = Math.max(
      0,
      frameIndexAt(event.startMs + span * PITCH_TRIM_HEAD),
    )
    const lastFrame = Math.min(
      tunedMidi.length - 1,
      frameIndexAt(event.endMs - span * PITCH_TRIM_TAIL),
    )

    const core: number[] = []
    for (let frame = firstFrame; frame <= lastFrame; frame++) {
      if (!Number.isNaN(tunedMidi[frame])) core.push(tunedMidi[frame])
    }

    const centerMidi = core.length > 0 ? median(core) : event.midi
    const coreCents = Float32Array.from(
      core,
      (midi) => (midi - centerMidi) * 100,
    )
    const vibrato =
      span >= VIBRATO_MIN_NOTE_MS ? detectVibrato(coreCents, hopMs) : null
    const direction = slideDirection(coreCents, hopMs)

    const startFrame = Math.max(0, frameIndexAt(event.startMs))
    const settleFrames = Math.round(CLEAN_START_MS / hopMs)
    let hasCleanStart = false
    for (let offset = 0; offset <= settleFrames; offset++) {
      const midi = tunedMidi[startFrame + offset]
      if (Math.abs(midi - centerMidi) * 100 <= CLOSE_CENTS) hasCleanStart = true
    }

    return {
      startMs: event.startMs,
      endMs: event.endMs,
      midi: event.midi,
      centerMidi,
      centsFromGrid: (centerMidi - event.midi) * 100,
      isGlide: direction !== 0,
      hasSlideIn: event.hasSlideIn ?? false,
      hasCleanStart,
      wobbleCents:
        span >= STEADINESS_MIN_NOTE_MS
          ? measureWobble(coreCents, hopMs, vibrato)
          : null,
      vibrato,
      direction,
    }
  }

  return mergeSlides(events.map(measure)).map((event) => {
    const { direction: _direction, ...note } = measure(event)

    return note
  })
}
