import { percentile } from './takeStats'

/* About 12 s across a phone, with 200 ms notes still wide enough to tap. */
const PIXELS_PER_SECOND = 60
/* Room above and below the outermost notes so their blocks aren't cut off. */
const PITCH_PADDING_SEMITONES = 2
/* A one-note take would otherwise fill the chart with a single huge block. */
const MIN_PITCH_SPAN_SEMITONES = 12
/* Slides can run well past the notes, so they count towards the range. This share
 * is ignored at each end, so one wild reading can't squash the whole chart. */
const PITCH_LINE_OUTLIER_SHARE = 0.01
/* Round steps a reader can count along, smallest first. */
const TIME_TICK_STEPS_MS = [1000, 2000, 5000, 10_000, 15_000, 30_000, 60_000]
/* Keeps "0:00" labels well apart, with room to read each at a glance. */
const MIN_TIME_TICK_SPACING_PX = 80

export type TimeAxis = {
  durationMs: number
  contentWidth: number
  isRtl: boolean
}

/* Never narrower than the viewport, so a short take fills the map. */
export function contentWidthFor(
  durationMs: number,
  viewportWidth: number,
): number {
  return Math.max(viewportWidth, (durationMs / 1000) * PIXELS_PER_SECOND)
}

/* The smallest round step whose labels don't crowd each other at this scale. */
export function timeTickStepMs({ durationMs, contentWidth }: TimeAxis): number {
  const pixelsPerMs = durationMs > 0 ? contentWidth / durationMs : 0
  const roomyStep = TIME_TICK_STEPS_MS.find(
    (step) => step * pixelsPerMs >= MIN_TIME_TICK_SPACING_PX,
  )

  return roomyStep ?? TIME_TICK_STEPS_MS[TIME_TICK_STEPS_MS.length - 1]
}

/*
 * The scroller is always laid out LTR because RTL scrollLeft differs between
 * browsers; time itself is flipped here instead. See pitchHistoryScroll.ts.
 */
export function timeToContentX(
  timeMs: number,
  { durationMs, contentWidth, isRtl }: TimeAxis,
): number {
  if (durationMs <= 0) return isRtl ? contentWidth : 0

  const x = (timeMs / durationMs) * contentWidth

  return isRtl ? contentWidth - x : x
}

export function contentXToTime(
  x: number,
  { durationMs, contentWidth, isRtl }: TimeAxis,
): number {
  const clampedX = Math.max(0, Math.min(contentWidth, x))
  const ratio = clampedX / contentWidth

  return (isRtl ? 1 - ratio : ratio) * durationMs
}

/* The scrollLeft that shows a take's opening moment. */
export function startScrollLeft(
  contentWidth: number,
  viewportWidth: number,
  isRtl: boolean,
): number {
  return isRtl ? Math.max(0, contentWidth - viewportWidth) : 0
}

/* null when the x is already on screen, so playback doesn't fight the singer's
 * own scrolling. Otherwise turns the page, leaving a little context behind. */
export function scrollLeftToReveal(
  contentX: number,
  scrollLeft: number,
  viewportWidth: number,
  isRtl: boolean,
): number | null {
  if (contentX >= scrollLeft && contentX <= scrollLeft + viewportWidth) {
    return null
  }

  const leadIn = viewportWidth / 8

  return Math.max(
    0,
    isRtl ? contentX - viewportWidth + leadIn : contentX - leadIn,
  )
}

/* The notes plus where the sung line actually went. NaN marks unvoiced frames. */
export function pitchRangeForTake(
  noteMidis: number[],
  tunedMidi: Float32Array,
): { midiMin: number; midiMax: number } {
  const voiced = tunedMidi.filter((midi) => !Number.isNaN(midi))
  if (voiced.length === 0) return pitchRangeFor(noteMidis)

  return pitchRangeFor([
    ...noteMidis,
    Math.floor(percentile(voiced, PITCH_LINE_OUTLIER_SHARE)),
    Math.ceil(percentile(voiced, 1 - PITCH_LINE_OUTLIER_SHARE)),
  ])
}

export function pitchRangeFor(midis: number[]): {
  midiMin: number
  midiMax: number
} {
  if (midis.length === 0) return { midiMin: 60, midiMax: 72 }

  const low = Math.min(...midis) - PITCH_PADDING_SEMITONES
  const high = Math.max(...midis) + PITCH_PADDING_SEMITONES
  const shortfall = Math.max(0, MIN_PITCH_SPAN_SEMITONES - (high - low))

  return {
    midiMin: low - Math.floor(shortfall / 2),
    midiMax: high + Math.ceil(shortfall / 2),
  }
}
