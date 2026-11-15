/*
 * The numbers behind the bird's animations. Pure functions of the canvas clock,
 * so the bird freezes with the field on a crash or a win and scrubs
 * deterministically on the test page. Visual only: nothing here reaches the
 * hitbox, which is derived from the bird's pitch in singFlyGeometry.
 */

/* ms — one full wing beat, and with it one up-and-down of the hover bob. */
export const FLAP_PERIOD_MS = 600
/* px — how far the body rides above and below its true height while hovering.
 * Kept under BIRD_RADIUS - BIRD_RADIUS / √2 (about 2.6px), the margin between
 * the drawn body and its hitbox square, so the hitbox stays inside the body. */
export const HOVER_BOB_PX = 2
/* ms — the eye closes for BLINK_MS once every BLINK_PERIOD_MS. */
export const BLINK_PERIOD_MS = 3500
export const BLINK_MS = 120

/** Where the wing is in its beat: 1 = raised, -1 = fully down. */
export function wingLift(now: number): number {
  return Math.cos((now / FLAP_PERIOD_MS) * Math.PI * 2)
}

/**
 * px to draw the body below (+) or above (-) its true height. The body is
 * pushed up by the downstroke, so it rides highest when the wing is fully down
 * and lowest when the wing is raised: the bob is the wing position, scaled.
 */
export function hoverBobOffset(now: number): number {
  return HOVER_BOB_PX * wingLift(now)
}

export function isBlinking(now: number): boolean {
  return now % BLINK_PERIOD_MS < BLINK_MS
}
