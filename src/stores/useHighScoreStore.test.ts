import { beforeEach, describe, expect, test } from 'vitest'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

import {
  highScoreKey,
  isBetter,
  useHighScoreStore,
  type HighScore,
  type HighScoreInput,
} from './useHighScoreStore'

const createInput = (overrides?: Partial<HighScoreInput>): HighScoreInput => ({
  game: 'singTone',
  config: { rounds: 5, holdSec: 0.75 },
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
      createInput({ config: { rounds: 10, holdSec: 0.75 }, correct: 9 }),
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

  test('should drop malformed entries on load', () => {
    const valid = createScore()
    localStorage.setItem(
      'syng.highScores',
      JSON.stringify({
        good: valid,
        bad: { game: 'unknownGame', correct: 'x' },
      }),
    )

    const store = useHighScoreStore()

    expect(store.allScores).toEqual([valid])
  })

  test('should keep scores saved under a renamed program key', () => {
    const config = { durationSec: 20, holdSec: 0.1 }
    const legacy = { ...createScore({ config }), game: 'pitchGame' }
    localStorage.setItem(
      'syng.highScores',
      JSON.stringify({ 'pitchGame|durationSec=20,holdSec=0.1': legacy }),
    )

    const store = useHighScoreStore()

    expect(store.bestFor('noteRush', config)).toEqual(
      createScore({ game: 'noteRush', config }),
    )
    expect(store.allScores).toHaveLength(1)
  })

  test('should recover from a stored value that is not an object', () => {
    localStorage.setItem('syng.highScores', JSON.stringify([1, 2]))

    const store = useHighScoreStore()

    expect(store.allScores).toHaveLength(0)
  })
})
