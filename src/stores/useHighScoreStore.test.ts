import { beforeEach, describe, expect, test } from 'vitest'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

import {
  HIGH_SCORE_CONFIG_FIELDS,
  HIGH_SCORE_GAMES,
  highScoreKey,
  isBetter,
  useHighScoreStore,
  type HighScore,
  type HighScoreConfig,
  type HighScoreGame,
  type HighScoreInput,
} from './useHighScoreStore'

const HIGH_SCORES_KEY = 'syng.highScores'

/* A config with exactly the settings the game saves, all set to one value. */
const createConfig = (
  game: HighScoreGame,
  value: string | number = 1,
): HighScoreConfig =>
  Object.fromEntries(
    HIGH_SCORE_CONFIG_FIELDS[game].map((name) => [name, value]),
  )

const createInput = (overrides?: Partial<HighScoreInput>): HighScoreInput => ({
  game: 'singTone',
  config: createConfig('singTone'),
  correct: 3,
  total: 5,
  elapsedMs: 20_000,
  ...overrides,
})

const createScore = (overrides?: Partial<HighScore>): HighScore => ({
  ...createInput(),
  achievedAt: 0,
  ...overrides,
})

/* Saves one score through the store and returns what it wrote to storage, so
 * a test can add a corrupt or stale entry next to a real one. */
async function saveOneScore(): Promise<Record<string, HighScore>> {
  useHighScoreStore().recordScore(createInput())
  /* useLocalStorage writes from a watcher, so the write lands on the next tick */
  await nextTick()
  setActivePinia(createPinia())

  return JSON.parse(localStorage.getItem(HIGH_SCORES_KEY) ?? '{}')
}

describe('highScoreKey', () => {
  test('returns the same key whatever the config order', () => {
    expect(highScoreKey('doReMi', { difficulty: 'hard', holdSec: 1 })).toBe(
      highScoreKey('doReMi', { holdSec: 1, difficulty: 'hard' }),
    )
  })

  test('returns different keys for different settings', () => {
    expect(highScoreKey('doReMi', { difficulty: 'easy' })).not.toBe(
      highScoreKey('doReMi', { difficulty: 'hard' }),
    )
  })
})

describe('isBetter', () => {
  test.each([
    { name: 'more correct', candidate: { correct: 4 }, expected: true },
    { name: 'fewer correct', candidate: { correct: 2 }, expected: false },
    {
      name: 'same correct, faster',
      candidate: { elapsedMs: 19_000 },
      expected: true,
    },
    {
      name: 'same correct, slower',
      candidate: { elapsedMs: 21_000 },
      expected: false,
    },
    { name: 'an equal run', candidate: {}, expected: false },
    {
      name: 'same correct without a time',
      candidate: { elapsedMs: null },
      expected: false,
    },
  ])('returns $expected for $name', ({ candidate, expected }) => {
    expect(isBetter(createScore(candidate), createScore())).toBe(expected)
  })
})

describe('useHighScoreStore', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('should save a first entry without calling it a new record', () => {
    const store = useHighScoreStore()

    const result = store.recordScore(createInput())

    expect(result.isNewRecord).toBe(false)
    expect(result.previous).toBeUndefined()
    expect(result.best?.correct).toBe(3)
    expect(store.allScores).toHaveLength(1)
  })

  test('should replace the entry and report a new record when beaten', () => {
    const store = useHighScoreStore()
    store.recordScore(createInput())

    const result = store.recordScore(createInput({ correct: 4 }))

    expect(result.isNewRecord).toBe(true)
    expect(result.previous?.correct).toBe(3)
    expect(result.best?.correct).toBe(4)
    expect(store.allScores).toHaveLength(1)
  })

  test('should keep the best when the run is worse', () => {
    const store = useHighScoreStore()
    store.recordScore(createInput({ correct: 4 }))

    const result = store.recordScore(createInput({ correct: 2 }))

    expect(result.isNewRecord).toBe(false)
    expect(result.best?.correct).toBe(4)
    expect(store.bestFor('singTone', createInput().config)?.correct).toBe(4)
  })

  test('should save the time in whole milliseconds', () => {
    const store = useHighScoreStore()

    const result = store.recordScore(
      createInput({ elapsedMs: 1583.2999999999884 }),
    )

    expect(result.best?.elapsedMs).toBe(1583)
  })

  test('should not save a run with nothing correct', () => {
    const store = useHighScoreStore()

    const result = store.recordScore(createInput({ correct: 0 }))

    expect(result.best).toBeUndefined()
    expect(store.allScores).toHaveLength(0)
  })

  test('should keep separate entries for different settings', () => {
    const store = useHighScoreStore()

    store.recordScore(createInput())
    const result = store.recordScore(
      createInput({ config: createConfig('singTone', 2), correct: 9 }),
    )

    expect(result.isNewRecord).toBe(false)
    expect(store.allScores).toHaveLength(2)
  })

  test('should keep scores in localStorage across store instances', async () => {
    useHighScoreStore().recordScore(createInput())
    /* useLocalStorage writes from a watcher, so the write lands on the next tick */
    await nextTick()
    setActivePinia(createPinia())

    expect(useHighScoreStore().allScores).toHaveLength(1)
  })

  test('should clear every entry', () => {
    const store = useHighScoreStore()
    store.recordScore(createInput())

    store.clear()

    expect(store.allScores).toHaveLength(0)
  })

  test('should drop malformed entries on load', async () => {
    const saved = await saveOneScore()
    localStorage.setItem(
      HIGH_SCORES_KEY,
      JSON.stringify({
        ...saved,
        bad: { game: 'unknownGame', correct: 'x' },
      }),
    )

    const store = useHighScoreStore()

    expect(store.allScores).toEqual(Object.values(saved))
    expect(store.allScores).toHaveLength(1)
  })

  test('should keep scores saved under a renamed program key', () => {
    const config = createConfig('noteRush')
    const legacy = { ...createScore({ config }), game: 'pitchGame' }
    const legacyKey = highScoreKey('noteRush', config).replace(
      'noteRush',
      'pitchGame',
    )
    localStorage.setItem(
      HIGH_SCORES_KEY,
      JSON.stringify({ [legacyKey]: legacy }),
    )

    const store = useHighScoreStore()

    expect(store.bestFor('noteRush', config)).toEqual(
      createScore({ game: 'noteRush', config }),
    )
    expect(store.allScores).toHaveLength(1)
  })

  test.each<{ name: string; config: HighScoreConfig }>([
    {
      name: 'a setting missing',
      config: Object.fromEntries(
        Object.entries(createConfig('noteRush')).slice(1),
      ),
    },
    {
      name: 'a setting the game no longer has',
      config: { ...createConfig('noteRush'), removedSetting: 1 },
    },
  ])('should delete a stored score with $name', async ({ config }) => {
    const saved = await saveOneScore()
    const stale = createScore({ game: 'noteRush', config })
    localStorage.setItem(
      HIGH_SCORES_KEY,
      JSON.stringify({ ...saved, [highScoreKey('noteRush', config)]: stale }),
    )

    const store = useHighScoreStore()
    await nextTick()

    expect(store.allScores).toEqual(Object.values(saved))
    expect(store.allScores).toHaveLength(1)
    expect(localStorage.getItem(HIGH_SCORES_KEY)).not.toContain('noteRush')
  })

  test('should list the saved settings of every game', () => {
    expect(Object.keys(HIGH_SCORE_CONFIG_FIELDS).toSorted()).toEqual(
      [...HIGH_SCORE_GAMES].toSorted(),
    )
  })

  test('should recover from a stored value that is not an object', () => {
    localStorage.setItem(HIGH_SCORES_KEY, JSON.stringify([1, 2]))

    const store = useHighScoreStore()

    expect(store.allScores).toHaveLength(0)
  })
})
