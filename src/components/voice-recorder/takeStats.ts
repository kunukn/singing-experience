/* Small numeric helpers shared by the take analysis modules. */

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

/* 0 at `low`, 1 at `high`, clamped. Pass low > high for a falling ramp. */
export function ramp(value: number, low: number, high: number): number {
  return clamp01((value - low) / (high - low))
}

/* Linear interpolation between ranks; 0 for an empty list. */
export function percentile(values: ArrayLike<number>, ratio: number): number {
  if (values.length === 0) return 0

  const sorted = Float64Array.from(values).sort()
  const position = (sorted.length - 1) * ratio
  const lower = Math.floor(position)
  const upper = Math.min(sorted.length - 1, lower + 1)

  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower)
}

export function median(values: ArrayLike<number>): number {
  return percentile(values, 0.5)
}

export function mean(values: ArrayLike<number>): number {
  if (values.length === 0) return 0

  let total = 0
  for (let i = 0; i < values.length; i++) total += values[i]

  return total / values.length
}

/* Least-squares slope of values against their index. */
export function slopePerIndex(values: ArrayLike<number>): number {
  const count = values.length
  if (count < 2) return 0

  const middleIndex = (count - 1) / 2
  const valueMean = mean(values)
  let covariance = 0
  let variance = 0

  for (let i = 0; i < count; i++) {
    covariance += (i - middleIndex) * (values[i] - valueMean)
    variance += (i - middleIndex) ** 2
  }

  return covariance / variance
}

/*
 * Mean of cents values on a 100¢ circle, in [-50, 50). Pitches sit near the
 * semitone grid, so -49¢ and +49¢ are neighbours and must not average to 0.
 */
export function circularMeanCents(
  cents: ArrayLike<number>,
  weights?: ArrayLike<number>,
): number {
  let sine = 0
  let cosine = 0

  for (let i = 0; i < cents.length; i++) {
    const angle = (cents[i] / 100) * 2 * Math.PI
    const weight = weights ? weights[i] : 1
    sine += Math.sin(angle) * weight
    cosine += Math.cos(angle) * weight
  }

  if (sine === 0 && cosine === 0) return 0

  return (Math.atan2(sine, cosine) / (2 * Math.PI)) * 100
}
