import { HISTORY_WINDOW_MS } from './noteRushConstants'
import { LEAD_IN_MS, type GameTarget } from './useNoteRush'

/*
 * How far back a finished round can be scrolled: its length beyond the one
 * window the chart already shows. A target enters the chart LEAD_IN_MS before
 * its dueTime, so the first target's entry is where the round starts.
 */
export function getReviewScrollableMs(
  targets: GameTarget[],
  pausedAt: number | null,
): number {
  if (pausedAt === null || targets.length === 0) return 0

  let firstDueTime = Infinity
  for (const target of targets) {
    firstDueTime = Math.min(firstDueTime, target.dueTime)
  }
  const roundStart = firstDueTime - LEAD_IN_MS

  return Math.max(0, pausedAt - roundStart - HISTORY_WINDOW_MS)
}
