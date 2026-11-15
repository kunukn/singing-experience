import { describe, expect, test } from 'vitest'

import {
  BLINK_MS,
  BLINK_PERIOD_MS,
  FLAP_PERIOD_MS,
  HOVER_BOB_PX,
  hoverBobOffset,
  isBlinking,
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

  test('should blink briefly once per blink period', () => {
    expect(isBlinking(BLINK_PERIOD_MS)).toBe(true)
    expect(isBlinking(BLINK_PERIOD_MS + BLINK_MS - 1)).toBe(true)
    expect(isBlinking(BLINK_PERIOD_MS + BLINK_MS)).toBe(false)
    expect(isBlinking(BLINK_PERIOD_MS * 1.5)).toBe(false)
  })
})
