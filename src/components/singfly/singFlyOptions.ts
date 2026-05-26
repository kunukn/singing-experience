export const GAME_DURATION_OPTIONS = [5, 10, 20, 30, 40, 50, 60] as const

export type GameDurationSec = (typeof GAME_DURATION_OPTIONS)[number]

export const DEFAULT_GAME_DURATION_SEC: GameDurationSec = 10

export const DIFFICULTY_OPTIONS = ['easy', 'normal', 'hard'] as const

export type Difficulty = (typeof DIFFICULTY_OPTIONS)[number]

export const DEFAULT_DIFFICULTY: Difficulty = 'easy'
