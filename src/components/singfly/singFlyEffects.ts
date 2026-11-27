/*
 * The numbers behind the bird's animations. Pure functions of the canvas clock,
 * so the bird freezes with the field on a crash or a win and scrubs
 * deterministically on the test page. Visual only: nothing here reaches the
 * hitbox, which is derived from the bird's pitch in singFlyGeometry.
 */
import { animationProgress } from '@/components/note-rush/noteRushEffects'

/* ms — one full wing beat, and with it one up-and-down of the hover bob. */
export const FLAP_PERIOD_MS = 600
/* px — how far the body rides above and below its true height while hovering.
 * Kept under BIRD_RADIUS - BIRD_RADIUS / √2 (about 2.6px), the margin between
 * the drawn body and its hitbox square, so the hitbox stays inside the body. */
export const HOVER_BOB_PX = 2
/* ms — the eye closes for BLINK_MS once every BLINK_PERIOD_MS. */
export const BLINK_PERIOD_MS = 3500
export const BLINK_MS = 120

/* ms — time constant the bird's vertical speed is smoothed with. The bird
 * crosses an interval in under 100ms, too brief to see a tilt; smoothed, the
 * tilt builds during the move and settles over the next quarter second. */
export const TILT_SMOOTHING_MS = 120
/* rad — the furthest the bird noses up or down (about 20°). */
export const MAX_TILT = 0.35
/* rad per px/ms — a two-semitone step peaks near 10°, a big leap hits the cap. */
const TILT_PER_SPEED = 1.2
/* Share of the level-flight wing swing: a descending bird glides on shallow
 * beats, a climbing one beats hard. */
const MIN_FLAP_STRENGTH = 0.25
const MAX_FLAP_STRENGTH = 1.5
/* Per px/ms — the same two-semitone climb adds about 40% to the swing. */
const FLAP_STRENGTH_PER_SPEED = 3

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

/**
 * Eases the smoothed vertical speed (px/ms, + is downward) toward the speed
 * measured over the last `dtMs`.
 */
export function smoothVelocity(
  previous: number,
  instant: number,
  dtMs: number,
): number {
  return (
    previous + (instant - previous) * (1 - Math.exp(-dtMs / TILT_SMOOTHING_MS))
  )
}

/** rad to rotate a right-facing bird: negative noses up, for a climb. */
export function tiltFromVelocity(velocity: number): number {
  return Math.max(-MAX_TILT, Math.min(MAX_TILT, velocity * TILT_PER_SPEED))
}

/** Multiplier on the wing swing: above 1 while climbing, below while sinking. */
export function flapStrength(velocity: number): number {
  return Math.max(
    MIN_FLAP_STRENGTH,
    Math.min(MAX_FLAP_STRENGTH, 1 - velocity * FLAP_STRENGTH_PER_SPEED),
  )
}

/* ms — the "+1" that rises from the gap of a pipe the bird just passed. */
export const PASS_SCORE_FLOAT_MS = 900
/* ms — the ring that spreads from that gap. */
export const PASS_RING_MS = 500
/* ms — how long the bird keeps its happy eye after a pass. */
export const HAPPY_MS = 500
/* ms — the squash-and-stretch of the bird the moment it passes a pipe. */
export const HAPPY_POP_MS = 400

/**
 * 0 → 1 → 0 over the pop that follows a pass, `elapsedMs` after it: one
 * half-sine, so the body squashes wide and springs back.
 */
export function happyPop(elapsedMs: number): number {
  if (elapsedMs < 0) return 0

  return Math.sin(Math.PI * animationProgress(elapsedMs, HAPPY_POP_MS))
}

export function isBlinking(now: number): boolean {
  return now % BLINK_PERIOD_MS < BLINK_MS
}
