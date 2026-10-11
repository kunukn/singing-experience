import { HISTORY_WINDOW_MS } from './pitchConstants'

/*
 * Maps the pitch chart's native horizontal scroller to a time offset: how many
 * ms back from the end of the take the chart's live edge sits.
 *
 * The scroller is always laid out LTR, so scrollLeft runs 0 → max in every
 * browser — RTL scrollLeft is negative in some and positive in others. The
 * chart's own direction is applied here instead:
 * - LTR chart: newest on the right, so the newest view is scrollLeft = max.
 * - RTL chart: newest on the left, so the newest view is scrollLeft = 0.
 */
export type PitchHistoryTimeScale = {
  /* Pixels per ms of history — the same scale the canvas draws at, so the
   * trail follows the finger 1:1 */
  pxPerMs: number
  /* How far back the view can go: take length beyond the visible window */
  scrollableMs: number
}

export type PitchHistoryScrollGeometry = PitchHistoryTimeScale & {
  isRtl: boolean
}

function clampOffsetMs(offsetMs: number, scrollableMs: number): number {
  return Math.min(scrollableMs, Math.max(0, offsetMs))
}

export function scrollLeftToOffsetMs(
  scrollLeft: number,
  geometry: PitchHistoryScrollGeometry,
): number {
  const { pxPerMs, scrollableMs, isRtl } = geometry
  if (pxPerMs <= 0) return 0

  const scrolledMs = scrollLeft / pxPerMs

  /* Clamped: iOS's rubber band takes scrollLeft past either end */
  return clampOffsetMs(
    isRtl ? scrolledMs : scrollableMs - scrolledMs,
    scrollableMs,
  )
}

export function offsetMsToScrollLeft(
  offsetMs: number,
  geometry: PitchHistoryScrollGeometry,
): number {
  const { pxPerMs, scrollableMs, isRtl } = geometry
  const clamped = clampOffsetMs(offsetMs, scrollableMs)

  return (isRtl ? clamped : scrollableMs - clamped) * pxPerMs
}

/*
 * Where the position thumb sits along the chart, as fractions of its width.
 * `startFraction` is measured from the inline-start edge — the oldest side
 * in both directions, since the chart mirrors in RTL.
 */
export function getScrollThumb(
  offsetMs: number,
  scrollableMs: number,
): { sizeFraction: number; startFraction: number } | null {
  if (scrollableMs <= 0) return null

  const sizeFraction = HISTORY_WINDOW_MS / (HISTORY_WINDOW_MS + scrollableMs)
  const progress = 1 - clampOffsetMs(offsetMs, scrollableMs) / scrollableMs

  return { sizeFraction, startFraction: progress * (1 - sizeFraction) }
}
