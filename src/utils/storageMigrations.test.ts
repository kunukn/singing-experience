import { beforeEach, describe, expect, test } from 'vitest'
import { migrateStorageKeys } from './storageMigrations'

/*
 * Deliberate time bomb. A migration table only earns its keep while real
 * browsers still hold the old keys; past that it is dead code nobody dares
 * touch. Twelve months after the 706c37d rename this fails and says what to
 * remove. Do not silence it by pushing the date out — either the migrations
 * still matter (then say why here) or they go.
 */
const REMOVE_MIGRATIONS_AFTER = new Date('2027-08-09')

describe('storage migration lifetime', () => {
  test('migrations are removed once they stop earning their keep', () => {
    expect(
      new Date() < REMOVE_MIGRATIONS_AFTER,
      'Time to delete: STORAGE_MIGRATIONS and migrateStorageKeys in storageMigrations.ts, the try/catch call in _init.ts, and this whole test file.',
    ).toBe(true)
  })
})

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
