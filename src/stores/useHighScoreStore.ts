import { useLocalStorage } from '@vueuse/core'

/* Program keys of the games that keep a best score — see `games` in programs.ts. */
export const HIGH_SCORE_GAMES = [
  'singTone',
  'doReMi',
  'singTheKeys',
  'graceKelly',
  'singFly',
  'pitchGame',
  'circleOfFifths',
] as const
export type HighScoreGame = (typeof HIGH_SCORE_GAMES)[number]

/*
 * The settings that make a run harder or easier. Two runs compete only when
 * these match exactly. Settings that just place the notes for the singer's
 * voice (voice range, start tone, octave) and display-only settings stay out,
 * so moving the key keeps the same record.
 */
export type HighScoreConfig = Record<string, string | number | boolean>

export type HighScore = {
  game: HighScoreGame
  config: HighScoreConfig
  correct: number
  total: number
  /* null for games whose run length is fixed, where time says nothing about the singer */
  elapsedMs: number | null
  achievedAt: number
}

export type HighScoreInput = Omit<HighScore, 'achievedAt'>

export type RecordResult = {
  /* True only when an existing best was beaten — a first entry is not a record */
  isNewRecord: boolean
  previous: HighScore | undefined
  best: HighScore | undefined
}

type HighScoreMap = Record<string, HighScore>

/* Sorted, so the key is the same however the config object was built. */
export function highScoreKey(game: HighScoreGame, config: HighScoreConfig) {
  const settings = Object.keys(config)
    .toSorted()
    .map((name) => `${name}=${config[name]}`)
    .join(',')

  return `${game}|${settings}`
}

/* More correct wins; on a tie, the faster run wins. An equal run is not better. */
export function isBetter(candidate: HighScore, current: HighScore) {
  if (candidate.correct !== current.correct)
    return candidate.correct > current.correct

  if (candidate.elapsedMs === null || current.elapsedMs === null) return false

  return candidate.elapsedMs < current.elapsedMs
}

function isHighScore(value: unknown): value is HighScore {
  if (typeof value !== 'object' || value === null) return false

  const score = value as Record<string, unknown>

  return (
    HIGH_SCORE_GAMES.includes(score.game as HighScoreGame) &&
    typeof score.config === 'object' &&
    score.config !== null &&
    typeof score.correct === 'number' &&
    typeof score.total === 'number' &&
    (score.elapsedMs === null || typeof score.elapsedMs === 'number') &&
    typeof score.achievedAt === 'number'
  )
}

export const useHighScoreStore = defineStore('highScores', () => {
  /* Keyed by highScoreKey. The literal key is what storageKeys.test.ts scans for. */
  const scores = useLocalStorage<HighScoreMap>('syng.highScores', {})

  /* Drop anything a hand edit or an older shape left behind, so one bad entry can't break the board. */
  const stored: unknown = scores.value
  if (typeof stored !== 'object' || stored === null || Array.isArray(stored)) {
    scores.value = {}
  } else {
    const entries = Object.entries(stored)
    const validEntries = entries.filter(([, score]) => isHighScore(score))
    if (validEntries.length !== entries.length) {
      scores.value = Object.fromEntries(validEntries)
    }
  }

  const allScores = computed(() => Object.values(scores.value))

  function bestFor(game: HighScoreGame, config: HighScoreConfig) {
    return scores.value[highScoreKey(game, config)]
  }

  function recordScore(input: HighScoreInput): RecordResult {
    const key = highScoreKey(input.game, input.config)
    const previous = scores.value[key]

    /* A silent run (no mic, no singing) isn't a score worth keeping. */
    if (input.correct <= 0) {
      return { isNewRecord: false, previous, best: previous }
    }

    const candidate: HighScore = {
      ...input,
      /* Whole ms: frame-by-frame timers add up float noise (1583.2999999999884) */
      elapsedMs: input.elapsedMs === null ? null : Math.round(input.elapsedMs),
      achievedAt: Date.now(),
    }
    if (previous && !isBetter(candidate, previous)) {
      return { isNewRecord: false, previous, best: previous }
    }

    scores.value = { ...scores.value, [key]: candidate }

    return { isNewRecord: previous !== undefined, previous, best: candidate }
  }

  function clear() {
    scores.value = {}
  }

  return { scores: readonly(scores), allScores, bestFor, recordScore, clear }
})
