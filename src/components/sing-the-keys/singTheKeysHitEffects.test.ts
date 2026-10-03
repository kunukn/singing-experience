import { describe, expect, test } from 'vitest'
import {
  buildSparks,
  buildStreamSparks,
  newlyCollectedIndices,
  SPARK_DURATION_MS,
  SPARK_FAN_HALF_ANGLE_DEG,
  SPARK_MAX_DELAY_MS,
  SPARK_RISE_MAX_PX,
  SPARK_RISE_MIN_PX,
  SPARK_RISE_SCALE_PER_TIER,
  SPARKS_PER_TIER,
  STREAM_SPARK_MAX_DURATION_MS,
  STREAM_SPARK_MIN_DURATION_MS,
  STREAM_SPARKS_PER_TIER,
  streakEndingAt,
  streakTier,
  tierValue,
} from './singTheKeysHitEffects'

const SPREAD_PX = 30

function setOfRange(from: number, to: number) {
  return new Set(Array.from({ length: to - from + 1 }, (_, i) => from + i))
}

describe('singTheKeysHitEffects - streakEndingAt', () => {
  test('returns 0 for a note that is not collected', () => {
    expect(streakEndingAt(new Set([0, 1]), 2)).toBe(0)
  })

  test('returns 1 for a hit with a miss before it', () => {
    expect(streakEndingAt(new Set([0, 2]), 2)).toBe(1)
  })

  test('counts a run of consecutive hits', () => {
    expect(streakEndingAt(new Set([0, 1, 2, 3]), 3)).toBe(4)
  })

  test('stops at a missed note', () => {
    expect(streakEndingAt(new Set([0, 1, 3, 4]), 4)).toBe(2)
  })

  test('counts the first note of the song', () => {
    expect(streakEndingAt(new Set([0]), 0)).toBe(1)
  })

  test('ignores hits after the given note', () => {
    expect(streakEndingAt(new Set([0, 1, 2, 3]), 1)).toBe(2)
  })

  test('stops counting at the last tier threshold', () => {
    expect(streakEndingAt(setOfRange(0, 39), 39)).toBe(10)
  })
})

describe('singTheKeysHitEffects - streakTier', () => {
  test.each([
    { streak: 0, tier: 0 },
    { streak: 1, tier: 0 },
    { streak: 2, tier: 0 },
    { streak: 3, tier: 1 },
    { streak: 5, tier: 1 },
    { streak: 6, tier: 2 },
    { streak: 9, tier: 2 },
    { streak: 10, tier: 3 },
    { streak: 40, tier: 3 },
  ])('returns tier $tier for a run of $streak', ({ streak, tier }) => {
    expect(streakTier(streak)).toBe(tier)
  })
})

describe('singTheKeysHitEffects - tierValue', () => {
  test('returns the entry for the tier', () => {
    expect(tierValue([4, 6, 8, 10], 2)).toBe(8)
  })

  test('clamps a tier outside the table', () => {
    expect(tierValue([4, 6, 8, 10], 9)).toBe(10)
    expect(tierValue([4, 6, 8, 10], -1)).toBe(4)
  })
})

describe('singTheKeysHitEffects - newlyCollectedIndices', () => {
  test('returns the indices that were added', () => {
    expect(newlyCollectedIndices([0, 1], [0, 1, 2])).toEqual([2])
  })

  test('returns nothing when the set shrinks', () => {
    expect(newlyCollectedIndices([0, 1, 2], [0, 1])).toEqual([])
  })

  test('returns nothing when the set is unchanged', () => {
    expect(newlyCollectedIndices([0, 1], [0, 1])).toEqual([])
  })

  test('returns nothing when the set is cleared', () => {
    expect(newlyCollectedIndices([0, 1], [])).toEqual([])
  })
})

describe('singTheKeysHitEffects - buildSparks', () => {
  test.each([0, 1, 2, 3])('builds the spark count of tier %i', (tier) => {
    expect(buildSparks(0, tier, SPREAD_PX)).toHaveLength(
      tierValue(SPARKS_PER_TIER, tier),
    )
  })

  test('builds the same sparks for the same note', () => {
    expect(buildSparks(7, 1, SPREAD_PX)).toEqual(buildSparks(7, 1, SPREAD_PX))
  })

  test('builds different sparks for different notes', () => {
    expect(buildSparks(7, 1, SPREAD_PX)).not.toEqual(
      buildSparks(8, 1, SPREAD_PX),
    )
  })

  test.each([0, 1, 2, 3])(
    'keeps every tier %i spark rising, in the fan and on time',
    (tier) => {
      const riseScale = tierValue(SPARK_RISE_SCALE_PER_TIER, tier)
      const fanRadians = (SPARK_FAN_HALF_ANGLE_DEG * Math.PI) / 180

      for (const noteIndex of [0, 1, 17, 41]) {
        for (const spark of buildSparks(noteIndex, tier, SPREAD_PX)) {
          const travelX = spark.toXPx - spark.fromXPx
          const distance = Math.hypot(travelX, spark.toYPx)

          expect(spark.toYPx).toBeLessThan(0)
          expect(Math.abs(spark.fromXPx)).toBeLessThanOrEqual(SPREAD_PX / 2)
          expect(distance).toBeGreaterThanOrEqual(SPARK_RISE_MIN_PX * riseScale)
          expect(distance).toBeLessThanOrEqual(SPARK_RISE_MAX_PX * riseScale)
          expect(
            Math.abs(Math.atan2(travelX, -spark.toYPx)),
          ).toBeLessThanOrEqual(fanRadians)
          expect(spark.delayMs).toBeGreaterThanOrEqual(0)
          expect(spark.delayMs).toBeLessThanOrEqual(SPARK_MAX_DELAY_MS)
          expect(spark.durationMs).toBe(SPARK_DURATION_MS)
        }
      }
    },
  )

  test('throws sparks to both sides of the note', () => {
    const sparks = buildSparks(3, 0, SPREAD_PX)

    expect(sparks.some((spark) => spark.toXPx < 0)).toBe(true)
    expect(sparks.some((spark) => spark.toXPx > 0)).toBe(true)
  })
})

describe('singTheKeysHitEffects - buildStreamSparks', () => {
  test.each([0, 1, 2, 3])('builds the stream count of tier %i', (tier) => {
    expect(buildStreamSparks(0, tier, SPREAD_PX)).toHaveLength(
      tierValue(STREAM_SPARKS_PER_TIER, tier),
    )
  })

  test('builds the same stream for the same note', () => {
    expect(buildStreamSparks(7, 1, SPREAD_PX)).toEqual(
      buildStreamSparks(7, 1, SPREAD_PX),
    )
  })

  test('builds a stream that differs from the note burst', () => {
    const flightOf = (spark: { toXPx: number; toYPx: number }) => [
      spark.toXPx,
      spark.toYPx,
    ]

    expect(buildStreamSparks(7, 0, SPREAD_PX).map(flightOf)).not.toEqual(
      buildSparks(7, 0, SPREAD_PX).slice(0, 3).map(flightOf),
    )
  })

  test('gives every spark its own loop length within the range', () => {
    const sparks = buildStreamSparks(5, 3, SPREAD_PX)
    const durations = sparks.map((spark) => spark.durationMs)

    for (const durationMs of durations) {
      expect(durationMs).toBeGreaterThanOrEqual(STREAM_SPARK_MIN_DURATION_MS)
      expect(durationMs).toBeLessThanOrEqual(STREAM_SPARK_MAX_DURATION_MS)
    }
    expect(new Set(durations).size).toBe(sparks.length)
  })

  test('staggers the starts across one shortest loop', () => {
    const delays = buildStreamSparks(5, 3, SPREAD_PX).map(
      (spark) => spark.delayMs,
    )

    expect(new Set(delays).size).toBe(delays.length)
    for (const delayMs of delays) {
      expect(delayMs).toBeGreaterThanOrEqual(0)
      expect(delayMs).toBeLessThan(STREAM_SPARK_MIN_DURATION_MS)
    }
  })

  test('keeps every stream spark rising', () => {
    for (const spark of buildStreamSparks(2, 2, SPREAD_PX)) {
      expect(spark.toYPx).toBeLessThan(0)
    }
  })
})
