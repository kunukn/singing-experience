/* About 12 s across a phone, with 200 ms notes still wide enough to tap. */
const PIXELS_PER_SECOND = 60
/* Room above and below the outermost notes so their blocks aren't cut off. */
const PITCH_PADDING_SEMITONES = 2
/* A one-note take would otherwise fill the chart with a single huge block. */
const MIN_PITCH_SPAN_SEMITONES = 12

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
