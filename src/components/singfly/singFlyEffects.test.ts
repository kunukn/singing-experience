import { describe, expect, test } from 'vitest'

import {
  BLINK_MS,
  BLINK_PERIOD_MS,
  FLAP_PERIOD_MS,
  HAPPY_POP_MS,
  HOVER_BOB_PX,
  MAX_TILT,
  TILT_SMOOTHING_MS,
  flapStrength,
  happyPop,
  hoverBobOffset,
  isBlinking,
  smoothVelocity,
  tiltFromVelocity,
  wingLift,
} from './singFlyEffects'
import { BIRD_RADIUS } from './singFlyGeometry'

describe('singFlyEffects', () => {
  test('should keep the hover bob within its amplitude over a whole beat', () => {
    for (let now = 0; now <= FLAP_PERIOD_MS; now += 10) {
      expect(Math.abs(hoverBobOffset(now))).toBeLessThanOrEqual(HOVER_BOB_PX)
    }
  })

  test('should keep the hitbox square inside the bobbing body', () => {
    /* The hitbox half-size is BIRD_RADIUS / √2; its side midpoints stay inside
     * the drawn circle as long as the bob is smaller than the difference. */
    expect(HOVER_BOB_PX).toBeLessThan(BIRD_RADIUS - BIRD_RADIUS / Math.SQRT2)
  })

  test('should ride highest when the wing is fully down', () => {
    const wingDownAt = FLAP_PERIOD_MS / 2

    expect(wingLift(wingDownAt)).toBeCloseTo(-1, 5)
    expect(hoverBobOffset(wingDownAt)).toBeCloseTo(-HOVER_BOB_PX, 5)
    expect(hoverBobOffset(0)).toBeCloseTo(HOVER_BOB_PX, 5)
  })

  test('should repeat the wing beat every period', () => {
    expect(wingLift(130 + FLAP_PERIOD_MS)).toBeCloseTo(wingLift(130), 5)
  })

  test('should ease the speed toward the measured one without overshooting', () => {
    const afterOneConstant = smoothVelocity(0, 1, TILT_SMOOTHING_MS)

    /* One time constant covers 1 - 1/e of the way */
    expect(afterOneConstant).toBeCloseTo(1 - 1 / Math.E, 5)
    expect(smoothVelocity(0, 1, 0)).toBe(0)
    expect(smoothVelocity(0, 1, 10_000)).toBeCloseTo(1, 5)
  })

  test('should nose up for a climb, down for a descent, and cap the tilt', () => {
    expect(tiltFromVelocity(0)).toBe(0)
    expect(tiltFromVelocity(-0.1)).toBeLessThan(0)
    expect(tiltFromVelocity(0.1)).toBeGreaterThan(0)
    expect(tiltFromVelocity(-5)).toBe(-MAX_TILT)
    expect(tiltFromVelocity(5)).toBe(MAX_TILT)
  })

  test('should beat harder while climbing and glide while sinking', () => {
    expect(flapStrength(0)).toBe(1)
    expect(flapStrength(-0.1)).toBeGreaterThan(1)
    expect(flapStrength(0.1)).toBeLessThan(1)
    expect(flapStrength(5)).toBeGreaterThan(0)
    expect(flapStrength(-5)).toBeLessThan(2)
  })

  test('should pop once after a pass and then settle', () => {
    expect(happyPop(0)).toBeCloseTo(0, 5)
    expect(happyPop(HAPPY_POP_MS / 2)).toBeCloseTo(1, 5)
    expect(happyPop(HAPPY_POP_MS)).toBeCloseTo(0, 5)
    expect(happyPop(Infinity)).toBeCloseTo(0, 5)
    expect(happyPop(-50)).toBe(0)
  })

  test('should blink briefly once per blink period', () => {
    expect(isBlinking(BLINK_PERIOD_MS)).toBe(true)
    expect(isBlinking(BLINK_PERIOD_MS + BLINK_MS - 1)).toBe(true)
    expect(isBlinking(BLINK_PERIOD_MS + BLINK_MS)).toBe(false)
    expect(isBlinking(BLINK_PERIOD_MS * 1.5)).toBe(false)
  })
})
