/*
 * Adaptive grid-division count based on the chart's pixel height.
 * Taller charts get more horizontal reference lines so semitone detail
 * stays visible. Breakpoints are tuned for the pitch / sing-tone charts.
 */
const TALL_HEIGHT_PX = 550
const MEDIUM_HEIGHT_PX = 400

const DIVISIONS_TALL = 12 // ~13 grid lines — every semitone for a 1-octave range
const DIVISIONS_MEDIUM = 8 // ~9 grid lines
const DIVISIONS_SHORT = 4 // ~5 grid lines (default)

export function getAdaptiveGridDivisions(containerHeight: number): number {
  if (containerHeight >= TALL_HEIGHT_PX) return DIVISIONS_TALL
  if (containerHeight >= MEDIUM_HEIGHT_PX) return DIVISIONS_MEDIUM

  return DIVISIONS_SHORT
}

/* Fraction of a step below which the top boundary note would collide with the
 * label beneath it. A label is roughly 24 px tall and the tightest grid puts
 * steps about 38 px apart, so anything under 0.6 of a step is a collision. */
const TOP_LABEL_MIN_GAP_RATIO = 0.6

/*
 * Reference notes down the Y axis: even steps up from midiMin, always ending
 * on midiMax so the top of the range stays labelled. A range that does not
 * divide evenly leaves a short gap above the last even step — when that gap is
 * too small to fit a label, the boundary note takes over the last slot instead
 * of being crowded in next to it.
 */
export function getGridMidis(
  midiMin: number,
  midiMax: number,
  containerHeight: number,
): number[] {
  const step = Math.max(
    1,
    Math.round((midiMax - midiMin) / getAdaptiveGridDivisions(containerHeight)),
  )
  const midis: number[] = []

  for (let midi = midiMin; midi <= midiMax; midi += step) {
    midis.push(midi)
  }

  const lastMidi = midis[midis.length - 1]
  if (lastMidi === midiMax) return midis

  const isCrowdingPrevious =
    midis.length > 1 && midiMax - lastMidi < step * TOP_LABEL_MIN_GAP_RATIO

  if (isCrowdingPrevious) {
    midis[midis.length - 1] = midiMax
  } else {
    midis.push(midiMax)
  }

  return midis
}

/* px of breathing room above and below the plotted pitch range. The canvas
 * keeps its own copy of these, since it reads them every animation frame. */
export const CHART_PADDING_TOP = 16
export const CHART_PADDING_BOTTOM = 16

export type ChartVerticalScale = {
  midiMin: number
  midiMax: number
  height: number
}

/*
 * Pixel position of a note on the vertical axis. Every overlay drawn beside
 * the chart — axis labels, the voice-type ribbon — has to agree with the
 * canvas here, or labels drift away from their grid lines.
 */
export function midiToChartY(midi: number, scale: ChartVerticalScale): number {
  const usableHeight = scale.height - CHART_PADDING_TOP - CHART_PADDING_BOTTOM
  const ratio = (midi - scale.midiMin) / (scale.midiMax - scale.midiMin)

  return CHART_PADDING_TOP + usableHeight * (1 - ratio)
}
