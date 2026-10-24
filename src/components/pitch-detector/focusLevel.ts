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

/*
 * Percentage points a take may slip below its rung before dropping a level.
 * Climbing needs the full threshold; dropping needs a clear dip, so a take
 * sitting on a boundary doesn't flicker between two rungs on every refresh.
 */
const LEVEL_DROP_MARGIN_PERCENT = 5

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

function meetsRule(
  stats: FocusToneStats,
  { minOnPitchPercent, minSpotOnPercent }: FocusLevelRule,
  marginPercent = 0,
) {
  return (
    stats.onPitchPercent >= minOnPitchPercent - marginPercent &&
    stats.spotOnPercent >= minSpotOnPercent - marginPercent
  )
}

/**
 * The rung the take has earned. Pass the level currently shown as
 * `currentLevel` to keep it until the take falls clearly below it.
 */
export function focusLevelFor(
  stats: FocusToneStats,
  currentLevel: FocusLevel | null = null,
): FocusLevel | null {
  if (stats.holdMs < LEVEL_MIN_HOLD_MS) return null

  const earnedIndex = FOCUS_LEVEL_RULES.findIndex((rule) =>
    meetsRule(stats, rule),
  )
  const currentIndex = FOCUS_LEVEL_RULES.findIndex(
    (rule) => rule.level === currentLevel,
  )
  /* Rules run highest first, so a lower index is a higher rung */
  const isDrop = currentIndex !== -1 && currentIndex < earnedIndex
  if (
    isDrop &&
    meetsRule(stats, FOCUS_LEVEL_RULES[currentIndex], LEVEL_DROP_MARGIN_PERCENT)
  ) {
    return FOCUS_LEVEL_RULES[currentIndex].level
  }

  return FOCUS_LEVEL_RULES[earnedIndex]?.level ?? 'warmingUp'
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
