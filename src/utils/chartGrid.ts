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
