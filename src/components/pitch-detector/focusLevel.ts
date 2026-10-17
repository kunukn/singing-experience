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

/*
 * On pitch (±20¢) carries the ladder, because that is what listeners judge.
 * The top two rungs also need Spot on (±10¢): that is where a lead singer
 * and a studio take part from a good choir voice.
 */
export function focusLevelFor(stats: FocusToneStats): FocusLevel | null {
  if (stats.holdMs < LEVEL_MIN_HOLD_MS) return null

  const { onPitchPercent, spotOnPercent } = stats
  if (onPitchPercent >= 95 && spotOnPercent >= 80) return 'pitchPerfect'
  if (onPitchPercent >= 90 && spotOnPercent >= 50) return 'leadSinger'
  if (onPitchPercent >= 75) return 'stageReady'
  if (onPitchPercent >= 60) return 'niceAndClose'
  if (onPitchPercent >= 40) return 'findingIt'

  return 'warmingUp'
}

/* The one change most likely to lift the take — the average offset first,
 * since it is the biggest single lever, then steadiness */
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

  return 'almost'
}
