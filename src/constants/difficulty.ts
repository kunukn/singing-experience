/* Named ordinal scale — keeps its conventional Easy → Hard order in every
 * select (see "Vertical Ordering" in AGENTS.md). */
export const DIFFICULTY_OPTIONS = ['easy', 'normal', 'hard'] as const

export type Difficulty = (typeof DIFFICULTY_OPTIONS)[number]
