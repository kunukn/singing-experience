export const HOLD_DURATION_OPTIONS = [0.05, 0.1, 0.2] as const
export const GAME_DURATION_OPTIONS = [5, 10, 20, 30] as const

export type HoldDurationSec = (typeof HOLD_DURATION_OPTIONS)[number]
export type GameDurationSec = (typeof GAME_DURATION_OPTIONS)[number]
