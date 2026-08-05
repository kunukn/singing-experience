import { beforeEach, describe, expect, test } from 'vitest'
import { isToneLabelMode, useToneLabelMode } from './toneLabelMode'

const STORAGE_KEY = 'test.toneLabelMode'

describe('isToneLabelMode', () => {
  test('accepts the three modes and nothing else', () => {
    expect(isToneLabelMode('off')).toBe(true)
    expect(isToneLabelMode('simple')).toBe(true)
    expect(isToneLabelMode('advanced')).toBe(true)

    expect(isToneLabelMode('"advanced"')).toBe(false) // JSON-quoted
    expect(isToneLabelMode('Advanced')).toBe(false)
    expect(isToneLabelMode('')).toBe(false)
    expect(isToneLabelMode(null)).toBe(false)
    expect(isToneLabelMode(2)).toBe(false)
  })
})

describe('useToneLabelMode', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  /* A distinct key per case: useLocalStorage keeps one ref per key for the
   * lifetime of the module, so a second call on the same key would read back
   * what the first one persisted rather than an empty store. */
  test('falls back to the default when nothing is stored', () => {
    expect(useToneLabelMode('test.toneLabelMode.emptyOff', 'off').value).toBe(
      'off',
    )
    expect(
      useToneLabelMode('test.toneLabelMode.emptySimple', 'simple').value,
    ).toBe('simple')
  })

  test('reads back a valid stored mode', () => {
    localStorage.setItem(STORAGE_KEY, 'advanced')

    expect(useToneLabelMode(STORAGE_KEY, 'off').value).toBe('advanced')
  })

  test('resolves an unrecognised stored mode to the default', () => {
    /* A JSON-quoted value is the likely shape of a hand-edited entry: it is
     * neither 'off' nor 'advanced', so without the guard every consumer would
     * render it as 'simple'. */
    localStorage.setItem(STORAGE_KEY, '"advanced"')

    expect(useToneLabelMode(STORAGE_KEY, 'off').value).toBe('off')
  })

  test('repairs the stored value on load', async () => {
    localStorage.setItem(STORAGE_KEY, 'nonsense')
    useToneLabelMode(STORAGE_KEY, 'simple')
    await nextTick()

    expect(localStorage.getItem(STORAGE_KEY)).toBe('simple')
  })

  test('persists a new selection', async () => {
    const toneLabelMode = useToneLabelMode(STORAGE_KEY, 'off')
    toneLabelMode.value = 'advanced'
    await nextTick()

    expect(localStorage.getItem(STORAGE_KEY)).toBe('advanced')
  })
})
