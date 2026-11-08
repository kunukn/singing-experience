/* Geometry for the ambient background waves (AmbientWaves.vue).
 *
 * The SVG is drawn twice as wide as the viewport and slid by -50% in a loop, so
 * each half must hold whole periods: then the frame at -50% is identical to the
 * frame at 0 and the loop has no visible seam. */

export const WAVE_VIEWBOX_WIDTH = 2400
export const WAVE_VIEWBOX_HEIGHT = 100

/* Returns an SVG path for a sine-like wave across the full viewBox width.
 *
 * `periodsPerHalf` — whole wave periods in each half (one visible screen width).
 * `amplitude`      — peak distance from the midline, in viewBox units.
 *
 * Built from one `Q` half-period followed by `T` segments: `T` mirrors the
 * previous control point, so the curve alternates up/down smoothly. A quadratic
 * peaks halfway to its control point, hence the control sits at 2× amplitude. */
export function wavePath(periodsPerHalf: number, amplitude: number): string {
  const mid = WAVE_VIEWBOX_HEIGHT / 2
  const halfPeriod = WAVE_VIEWBOX_WIDTH / 2 / periodsPerHalf / 2
  const halfPeriodCount = periodsPerHalf * 2 * 2

  const segments = [
    `M0,${mid}`,
    `Q${halfPeriod / 2},${mid - amplitude * 2} ${halfPeriod},${mid}`,
  ]

  for (let i = 2; i <= halfPeriodCount; i++) {
    segments.push(`T${halfPeriod * i},${mid}`)
  }

  return segments.join(' ')
}
