/* Source of numbers in [0, 1). Tests pass their own to get a fixed sequence. */
export type RandomSource = () => number

export function randomInt(
  min: number,
  max: number,
  random: RandomSource = Math.random,
): number {
  return Math.floor(random() * (max - min + 1)) + min
}

/* Random int in [min, max] that is never `exclude`, so a game never shows the
 * same note twice in a row. Falls back to the single available value when the
 * range collapses to one semitone (a repeat is unavoidable then — doesn't
 * happen with real voice ranges, all span ≥12 semitones). */
export function randomIntExcluding(
  min: number,
  max: number,
  exclude: number,
  random: RandomSource = Math.random,
): number {
  if (min >= max) return min

  let value = randomInt(min, max, random)
  while (value === exclude) {
    value = randomInt(min, max, random)
  }
  return value
}

/* Pick the next note: random in [min, max], never `previous`, and no more
 * than maxStep semitones from `previous`. maxStep === Infinity widens the
 * window back to the full range. */
export function randomMidiStep(
  min: number,
  max: number,
  previous: number | null,
  maxStep: number,
  random: RandomSource = Math.random,
): number {
  if (previous === null) return randomInt(min, max, random)

  const lowest = Math.max(min, previous - maxStep)
  const highest = Math.min(max, previous + maxStep)
  return randomIntExcluding(lowest, highest, previous, random)
}
