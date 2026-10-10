import { describe, expect, test } from 'vitest'
import { resetStoredSettings } from './resetStoredSettings'

function createStorage(entries: Record<string, string>) {
  const map = new Map(Object.entries(entries))

  return {
    get length() {
      return map.size
    },
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => {
      map.delete(key)
    },
    keys: () => [...map.keys()].sort(),
  }
}

describe('resetStoredSettings', () => {
  test('removes every syng. setting, including leftovers from old renames', () => {
    const storage = createStorage({
      'syng.rangeIndex': 'voiceRanges.bass',
      'syng.darkMode': 'true',
      'syng.songRecorderPianoRange': 'voiceRanges.choir',
    })

    resetStoredSettings(storage)

    expect(storage.keys()).toEqual([])
  })

  test('keeps the language and anything the app does not own', () => {
    const storage = createStorage({
      'syng.locale': 'ar',
      'syng.bpm': '90',
      'other.app': 'x',
    })

    resetStoredSettings(storage)

    expect(storage.keys()).toEqual(['other.app', 'syng.locale'])
  })
})
