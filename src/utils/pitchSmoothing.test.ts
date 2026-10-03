import { describe, expect, test } from 'vitest'
import { centsBetween } from './pitchMatch'
import { smoothPitch } from './pitchSmoothing'

const C3 = 130.81

function centsAbove(hz: number, cents: number) {
  return hz * 2 ** (cents / 1200)
}

describe('pitchSmoothing', () => {
  test('adopts the first pitch after silence as it is', () => {
    expect(smoothPitch(null, C3)).toBe(C3)
  })

  test('moves 30% of the way toward a nearby pitch', () => {
    const next = centsAbove(C3, 40)

    expect(smoothPitch(C3, next)).toBeCloseTo(C3 + 0.3 * (next - C3), 5)
  })

  test.each([
    { name: 'a whole tone up', cents: 200 },
    { name: 'a fifth up', cents: 700 },
    { name: 'a fifth down', cents: -700 },
  ])('adopts $name at once', ({ cents }) => {
    const next = centsAbove(C3, cents)

    expect(smoothPitch(C3, next)).toBe(next)
  })

  test('still averages a step of exactly a semitone', () => {
    const next = centsAbove(C3, 100)

    expect(smoothPitch(C3, next)).toBeLessThan(next)
  })

  test('never trails the sung pitch by more than a semitone on a slow slide', () => {
    /* 60 cents a frame, slower than the reset on any single frame. */
    let smoothed: number | null = null
    let worstCents = 0
    for (let frame = 0; frame <= 12; frame++) {
      const sung = centsAbove(C3, frame * 60)
      smoothed = smoothPitch(smoothed, sung)
      worstCents = Math.max(worstCents, Math.abs(centsBetween(sung, smoothed)))
    }

    expect(worstCents).toBeLessThanOrEqual(100)
  })
})
