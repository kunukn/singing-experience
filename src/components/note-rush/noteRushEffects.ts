/*
 * The numbers behind the board's animations: how long each one runs, how it
 * eases, and what a run of hits or a final score earns. Pure, so the canvas is
 * left with drawing only. Every animation is a function of "time since
 * something happened" — the chart redraws from scratch each frame, so nothing
 * here keeps state.
 */
import { STREAK_TIER_THRESHOLDS } from '@/components/sing-the-keys/singTheKeysHitEffects'

import type { GameTarget } from './useNoteRush'

/* ms — a note grows in as it enters the chart at the live edge. */
export const SPAWN_POP_MS = 350
/* ms — the squash-and-stretch of a note the moment it is hit. */
export const HIT_POP_MS = 420
/* ms — the ring that spreads out from a hit note. */
export const RIPPLE_MS = 600
/* ms — the "+1" that floats up from a hit note. */
export const SCORE_FLOAT_MS = 900
/* ms — a missed note sagging and fading. */
export const MISS_DROOP_MS = 500
/* ms — one up-and-down of an approaching note's idle bob. */
export const BOB_PERIOD_MS = 1600
/* ms — one beat of the "sing me now" ring on a note that can be caught. */
export const PULSE_PERIOD_MS = 700

/* Hits in a row from which the run is called out: the "+1" becomes "×N" and
 * the playing panel shows the run. The first streak tier, shared with Sing the
 * Keys so a run means the same in both games. */
export const STREAK_CALLOUT_MIN = STREAK_TIER_THRESHOLDS[0]

/* Share of the notes that earns the second star. */
const TWO_STAR_RATIO = 0.6

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

/** 0 → 1 over `durationMs`, starting `elapsedMs` ago; clamped at both ends. */
export function animationProgress(
  elapsedMs: number,
  durationMs: number,
): number {
  return clamp01(elapsedMs / durationMs)
}

export function easeOutCubic(progress: number): number {
  return 1 - (1 - progress) ** 3
}

/* Overshoots past 1 before settling, which reads as a springy "pop".
 * 1.70158 is the standard back-ease constant: about a 10% overshoot. */
const BACK_OVERSHOOT = 1.70158

export function easeOutBack(progress: number): number {
  return (
    1 +
    (BACK_OVERSHOOT + 1) * (progress - 1) ** 3 +
    BACK_OVERSHOOT * (progress - 1) ** 2
  )
}

/**
 * Stars for a finished round: 3 for every note, 2 for most of them, 1 for at
 * least one, 0 for none.
 */
export function starRating(score: number, totalTargets: number): number {
  if (score <= 0 || totalTargets <= 0) return 0
  if (score >= totalTargets) return 3
  if (score / totalTargets >= TWO_STAR_RATIO) return 2

  return 1
}

/**
 * The run of hits the singer is on right now: the streak of the note hit
 * last, or 0 once a note arriving after it has been missed. Targets are in
 * arrival order. Derived from them so the chart needs no extra prop.
 */
export function currentStreak(targets: readonly GameTarget[]): number {
  let lastHitIndex = -1
  let lastHitAt = -Infinity
  targets.forEach((target, index) => {
    if (target.status !== 'hit' || target.resolvedAt === null) return
    if (target.resolvedAt >= lastHitAt) {
      lastHitAt = target.resolvedAt
      lastHitIndex = index
    }
  })
  if (lastHitIndex === -1) return 0

  const isBroken = targets
    .slice(lastHitIndex + 1)
    .some((target) => target.status === 'missed')

  return isBroken ? 0 : targets[lastHitIndex].streak
}
