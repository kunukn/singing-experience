import { useLocalStorage } from '@vueuse/core'
import {
  DEFAULT_DIFFICULTY,
  DEFAULT_GAME_DURATION_SEC,
  DIFFICULTY_OPTIONS,
  GAME_DURATION_OPTIONS,
  type Difficulty,
  type GameDurationSec,
} from './singFlyOptions'

/* Persisted singfly settings shared by the real page and the test page.
 * Each ref is validated on load so a stale or hand-edited localStorage value
 * can't put the game in an impossible state. `syng.rangeIndex` is a
 * cross-feature key (also used by pitch-game / piano / pitch-detector /
 * sing-tone / warm-up) — keep the string identical. */
export function useSingFlySettings() {
  const rangeIndex = useVoiceRangeIndex('syng.rangeIndex')

  const gameDurationSec = useLocalStorage<number>(
    'syng.singFlyGameDurationSec',
    DEFAULT_GAME_DURATION_SEC,
  )
  if (
    !GAME_DURATION_OPTIONS.includes(gameDurationSec.value as GameDurationSec)
  ) {
    gameDurationSec.value = DEFAULT_GAME_DURATION_SEC
  }

  const difficulty = useLocalStorage<Difficulty>(
    'syng.singFlyDifficulty',
    DEFAULT_DIFFICULTY,
  )
  if (!DIFFICULTY_OPTIONS.includes(difficulty.value)) {
    difficulty.value = DEFAULT_DIFFICULTY
  }

  return { rangeIndex, gameDurationSec, difficulty }
}
