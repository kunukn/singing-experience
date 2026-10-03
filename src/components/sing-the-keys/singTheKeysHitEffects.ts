/*
 * The numbers behind the lane's hit glow: how long a run of collected notes is,
 * which size of burst that earns, and where each spark flies. Pure, so the
 * component that draws them is left with wiring and CSS only.
 */

/* Consecutive collected notes at which the burst steps up a size. Three steps,
 * so four tiers: a first hit is tier 0, a run of ten or more is tier 3. */
export const STREAK_TIER_THRESHOLDS = [3, 6, 10]

/* Per tier (0–3). A bigger run throws more sparks, further, off a larger and
 * brighter flare. The stream is the lighter trickle that keeps going while the
 * note is held. */
export const SPARKS_PER_TIER = [4, 6, 8, 10]
export const STREAM_SPARKS_PER_TIER = [3, 4, 5, 6]
export const FLARE_SCALE_PER_TIER = [1, 1.1, 1.2, 1.3]
export const FLASH_PEAK_OPACITY_PER_TIER = [0.75, 0.85, 0.95, 1]
export const SPARK_RISE_SCALE_PER_TIER = [1, 1.2, 1.4, 1.6]

/* px — how far a tier-0 spark travels. The longest tier-3 spark (60 × 1.6 =
 * 96px) still ends inside the shortest lane (240px). */
export const SPARK_RISE_MIN_PX = 28
export const SPARK_RISE_MAX_PX = 60

/* Degrees either side of straight up that the sparks fan out over. */
export const SPARK_FAN_HALF_ANGLE_DEG = 40

/* ms — a spark's flight, and the longest a spark waits before taking off so
 * the burst does not leave as one clump. */
export const SPARK_DURATION_MS = 520
export const SPARK_MAX_DELAY_MS = 90

/* ms — a stream spark's loop. Each spark gets its own length in this range, so
 * the sparks drift out of step and the stream never visibly repeats. */
export const STREAM_SPARK_MIN_DURATION_MS = 520
export const STREAM_SPARK_MAX_DURATION_MS = 860

/* ms — the flare's pop at the moment of collection. */
export const FLASH_DURATION_MS = 420

/* ms — when the last spark has landed and the burst can be removed. */
export const BURST_LIFETIME_MS = SPARK_DURATION_MS + SPARK_MAX_DELAY_MS

/* 1/φ. Multiples of it, taken modulo 1, land far from their neighbours, which
 * reads as random while staying the same on every run. */
const GOLDEN_RATIO_CONJUGATE = 0.6180339887498949

const MAX_STREAK = Math.max(...STREAK_TIER_THRESHOLDS)

/**
 * Length of the run of consecutively collected notes that ends at `index`; 0
 * when `index` itself is not collected. Derived rather than stored: a note is
 * only ever collected while it is the due one, so every earlier note is already
 * decided by the time a later one is hit, and a missed note simply is not in
 * the set. Rests have no index, so they do not break a run. Stops counting at
 * the last tier threshold, beyond which a longer run changes nothing.
 */
export function streakEndingAt(
  correct: ReadonlySet<number>,
  index: number,
): number {
  let streak = 0
  while (streak < MAX_STREAK && correct.has(index - streak)) streak += 1

  return streak
}

/** Burst size for a run: the number of thresholds it has reached. */
export function streakTier(streak: number): number {
  return STREAK_TIER_THRESHOLDS.filter((threshold) => streak >= threshold)
    .length
}

/** The tier's entry in a per-tier table, clamped to the table. */
export function tierValue(values: readonly number[], tier: number): number {
  const index = Math.max(0, Math.min(values.length - 1, tier))

  return values[index] ?? 0
}

/** Note indices in `current` that `previous` did not have. */
export function newlyCollectedIndices(
  previous: readonly number[],
  current: readonly number[],
): number[] {
  const known = new Set(previous)

  return current.filter((index) => !known.has(index))
}

/* Offsets in px from the point where the note meets the hit line; y is
 * negative upwards. */
export type Spark = {
  fromXPx: number
  toXPx: number
  toYPx: number
  delayMs: number
  durationMs: number
}

function fraction(seed: number): number {
  const product = seed * GOLDEN_RATIO_CONJUGATE

  return product - Math.floor(product)
}

/* Keeps a note's stream sparks from repeating its burst sparks. */
const STREAM_SEED_OFFSET = 7919

type SparkTiming = Pick<Spark, 'delayMs' | 'durationMs'>

/*
 * A fan of sparks. They leave from points spread evenly along `spreadPx` of
 * the hit line and fan evenly around straight up, so the fan never bunches to
 * one side; how far each one flies varies with the seed, so two fans never
 * look alike.
 */
function buildSparkFan(params: {
  seedBase: number
  count: number
  riseScale: number
  spreadPx: number
  timingOf: (seed: number, position: number) => SparkTiming
}): Spark[] {
  const { seedBase, count, riseScale, spreadPx, timingOf } = params

  return Array.from({ length: count }, (_, sparkIndex) => {
    /* 0–1 across the fan, at the middle of each spark's slot. */
    const position = (sparkIndex + 0.5) / count
    const angle =
      ((position * 2 - 1) * SPARK_FAN_HALF_ANGLE_DEG * Math.PI) / 180
    const seed = seedBase * count + sparkIndex + 1
    const risePx =
      (SPARK_RISE_MIN_PX +
        fraction(seed) * (SPARK_RISE_MAX_PX - SPARK_RISE_MIN_PX)) *
      riseScale
    const fromXPx = (position - 0.5) * spreadPx

    return {
      fromXPx,
      toXPx: fromXPx + Math.sin(angle) * risePx,
      toYPx: -Math.cos(angle) * risePx,
      ...timingOf(seed, position),
    }
  })
}

/**
 * The sparks of the burst thrown the moment a note is collected: all in flight
 * for the same time, each after its own short wait so they do not leave as one
 * clump.
 */
export function buildSparks(
  noteIndex: number,
  tier: number,
  spreadPx: number,
): Spark[] {
  const count = tierValue(SPARKS_PER_TIER, tier)

  return buildSparkFan({
    seedBase: noteIndex,
    count,
    riseScale: tierValue(SPARK_RISE_SCALE_PER_TIER, tier),
    spreadPx,
    /* A second, unrelated draw: reusing the rise's would tie delay to
     * distance. */
    timingOf: (seed) => ({
      delayMs: fraction(seed + count) * SPARK_MAX_DELAY_MS,
      durationMs: SPARK_DURATION_MS,
    }),
  })
}

/**
 * The sparks that keep rising while a collected note is held. Each loops on
 * its own period and starts at its own point in the shortest one, so the
 * stream is continuous from the first moment and drifts instead of repeating.
 */
export function buildStreamSparks(
  noteIndex: number,
  tier: number,
  spreadPx: number,
): Spark[] {
  const count = tierValue(STREAM_SPARKS_PER_TIER, tier)

  return buildSparkFan({
    seedBase: noteIndex + STREAM_SEED_OFFSET,
    count,
    riseScale: tierValue(SPARK_RISE_SCALE_PER_TIER, tier),
    spreadPx,
    timingOf: (seed, position) => ({
      delayMs: position * STREAM_SPARK_MIN_DURATION_MS,
      durationMs:
        STREAM_SPARK_MIN_DURATION_MS +
        fraction(seed + count) *
          (STREAM_SPARK_MAX_DURATION_MS - STREAM_SPARK_MIN_DURATION_MS),
    }),
  })
}
