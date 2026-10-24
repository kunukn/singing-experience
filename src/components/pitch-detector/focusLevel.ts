import { CLEAN_CENTS } from '@/utils/pitchColors'
import type { FocusToneStats } from './focusToneTracker'

/*
 * The growth ladder the focus tab awards a take. Named as steps on a journey
 * rather than verdicts, so a new singer sees how far they have come rather
 * than how far they are from a pro.
 */
export type FocusLevel =
  | 'warmingUp'
  | 'findingIt'
  | 'niceAndClose'
  | 'stageReady'
  | 'leadSinger'
  | 'pitchPerfect'

export type FocusTip =
  | 'keepHolding'
  | 'sharp'
  | 'flat'
  | 'steady'
  | 'almost'
  | 'aimMiddle'
  | 'nearlyPerfect'
  | 'perfect'

/* A 3 s hold before any level is given, so a lucky half-second can't earn
 * a title */
export const LEVEL_MIN_HOLD_MS = 3000

/* ¢ — heard-pitch wobble above this is audible unsteadiness; below it a
 * tone sounds still */
const STEADY_WOBBLE_CENTS = 15

export const FOCUS_LEVEL_EMOJI: Record<FocusLevel, string> = {
  warmingUp: '🌱',
  findingIt: '🎵',
  niceAndClose: '👍',
  stageReady: '🎤',
  leadSinger: '⭐',
  pitchPerfect: '💎',
}

export type FocusLevelRule = {
  level: FocusLevel
  minOnPitchPercent: number
  minSpotOnPercent: number
}

/*
 * On pitch (within CLOSE_CENTS) carries the ladder, because that is what
 * listeners judge. The top two rungs also need Spot on (within CLEAN_CENTS):
 * that is where a lead singer and a studio take part from a good choir voice.
 * Highest rung first; the level guide shows this same table, so the copy
 * can't drift from the scoring.
 */
export const FOCUS_LEVEL_RULES: readonly FocusLevelRule[] = [
  { level: 'pitchPerfect', minOnPitchPercent: 95, minSpotOnPercent: 80 },
  { level: 'leadSinger', minOnPitchPercent: 90, minSpotOnPercent: 50 },
  { level: 'stageReady', minOnPitchPercent: 75, minSpotOnPercent: 0 },
  { level: 'niceAndClose', minOnPitchPercent: 60, minSpotOnPercent: 0 },
  { level: 'findingIt', minOnPitchPercent: 40, minSpotOnPercent: 0 },
  { level: 'warmingUp', minOnPitchPercent: 0, minSpotOnPercent: 0 },
]

export function focusLevelFor(stats: FocusToneStats): FocusLevel | null {
  if (stats.holdMs < LEVEL_MIN_HOLD_MS) return null

  const rule = FOCUS_LEVEL_RULES.find(
    ({ minOnPitchPercent, minSpotOnPercent }) =>
      stats.onPitchPercent >= minOnPitchPercent &&
      stats.spotOnPercent >= minSpotOnPercent,
  )

  return rule?.level ?? 'warmingUp'
}

/*
 * The one change most likely to lift the take — the average offset first,
 * since it is the biggest single lever, then steadiness. A centred, steady
 * take gets a tip for its rung: from Stage ready up, the next step needs
 * Spot on, so "keep going" alone would not say what to change.
 */
export function focusTipFor(
  stats: FocusToneStats,
  level: FocusLevel | null,
): FocusTip | null {
  if (stats.holdMs === 0) return null

  if (level === null) return 'keepHolding'

  if (level === 'pitchPerfect') return 'perfect'

  if (stats.averageCents > CLEAN_CENTS) return 'sharp'

  if (stats.averageCents < -CLEAN_CENTS) return 'flat'

  if (stats.wobbleCents > STEADY_WOBBLE_CENTS) return 'steady'

  if (level === 'leadSinger') return 'nearlyPerfect'

  if (level === 'stageReady') return 'aimMiddle'

  return 'almost'
}
