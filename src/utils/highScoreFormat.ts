import type { HighScore, HighScoreGame } from '@/stores/useHighScoreStore'

/* Games where a finished run is always fully correct, so only the time tells runs apart. */
const TIME_ONLY_GAMES = new Set<HighScoreGame>(['doReMi', 'circleOfFifths'])

/* One decimal suits a run time; setting values like a 0.75s hold need two. */
export function formatSeconds(
  ms: number,
  locale: string,
  maximumFractionDigits = 1,
) {
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: 'second',
    unitDisplay: 'narrow',
    maximumFractionDigits,
  }).format(ms / 1000)
}

/*
 * A score as numbers and units only, so it needs no translation:
 * "4/5 · 23.4s", "12/14", or "23.4s" for the time-only games.
 */
export function formatHighScore(
  score: Pick<HighScore, 'game' | 'correct' | 'total' | 'elapsedMs'>,
  locale: string,
) {
  const parts: string[] = []
  if (!TIME_ONLY_GAMES.has(score.game)) {
    const number = new Intl.NumberFormat(locale)
    parts.push(`${number.format(score.correct)}/${number.format(score.total)}`)
  }
  if (score.elapsedMs !== null)
    parts.push(formatSeconds(score.elapsedMs, locale))

  return parts.join(' · ')
}
