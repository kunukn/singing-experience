import type { CircleMode } from './circleOfFifths'
import type { CircleOfFifthsPhase } from './circleOfFifthsMachine'

/* The five screens the singer can see. The machine owns the phase and the
 * page owns the mode; this is the one place the two are combined, so the
 * Display switches on a name instead of re-deriving it from both. */
export type CircleScreen =
  | 'walkIdle'
  | 'walking'
  | 'walkComplete'
  | 'exploreIdle'
  | 'patternSinging'

/* Only idle splits by mode — a round or its result already says which mode
 * it belongs to */
export function toCircleScreen(
  phase: CircleOfFifthsPhase,
  mode: CircleMode,
): CircleScreen {
  if (phase !== 'idle') return phase

  return mode === 'walk' ? 'walkIdle' : 'exploreIdle'
}
