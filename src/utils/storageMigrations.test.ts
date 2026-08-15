import { beforeEach, describe, expect, test } from 'vitest'
import { migrateStorageKeys } from './storageMigrations'

describe('migrateStorageKeys', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('moves a renamed key to its new name', () => {
    localStorage.setItem('old.key', '42')

    migrateStorageKeys([{ from: 'old.key', to: 'syng.newKey' }])

    expect(localStorage.getItem('syng.newKey')).toBe('42')
    expect(localStorage.getItem('old.key')).toBeNull()
  })

  /* The new value is what the user picked most recently — the stale entry
   * must not resurrect an older choice on top of it. */
  test('keeps the new value when both keys exist, and drops the old entry', () => {
    localStorage.setItem('old.key', 'stale')
    localStorage.setItem('syng.newKey', 'current')

    migrateStorageKeys([{ from: 'old.key', to: 'syng.newKey' }])

    expect(localStorage.getItem('syng.newKey')).toBe('current')
    expect(localStorage.getItem('old.key')).toBeNull()
  })

  test('deletes a retired key without copying it anywhere', () => {
    localStorage.setItem('syng.retired', 'voiceRanges.tenor')

    migrateStorageKeys([{ retire: 'syng.retired' }])

    expect(localStorage.getItem('syng.retired')).toBeNull()
  })

  test('leaves an untouched new key alone when the old one is absent', () => {
    localStorage.setItem('syng.newKey', 'current')

    migrateStorageKeys([{ from: 'old.key', to: 'syng.newKey' }])

    expect(localStorage.getItem('syng.newKey')).toBe('current')
  })

  /* Runs on every boot, so a second pass must not undo the first. */
  test('is idempotent', () => {
    localStorage.setItem('old.key', '42')
    const migrations = [{ from: 'old.key', to: 'syng.newKey' }]

    migrateStorageKeys(migrations)
    migrateStorageKeys(migrations)

    expect(localStorage.getItem('syng.newKey')).toBe('42')
    expect(localStorage.getItem('old.key')).toBeNull()
  })

  test('preserves falsy stored values', () => {
    localStorage.setItem('old.flag', 'false')
    localStorage.setItem('old.zero', '0')
    localStorage.setItem('old.empty', '')

    migrateStorageKeys([
      { from: 'old.flag', to: 'syng.flag' },
      { from: 'old.zero', to: 'syng.zero' },
      { from: 'old.empty', to: 'syng.empty' },
    ])

    expect(localStorage.getItem('syng.flag')).toBe('false')
    expect(localStorage.getItem('syng.zero')).toBe('0')
    expect(localStorage.getItem('syng.empty')).toBe('')
  })
})
