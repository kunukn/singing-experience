import { beforeEach, describe, expect, test, vi } from 'vitest'

import { del, get, set } from 'idb-keyval'

import { deleteSavedTake, loadTake, saveTake } from './takePersistence'
import type { Take } from './useVoiceRecorder'

const database = new Map<string, unknown>()

vi.mock('idb-keyval', () => ({
  createStore: vi.fn(() => 'store'),
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
}))

const createTake = (overrides: Partial<Take> = {}): Take => ({
  blob: new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/webm' }),
  mimeType: 'audio/webm',
  recordedAt: new Date(2026, 10, 4, 15, 30),
  stopReason: 'interrupted',
  hasAutoGain: false,
  ...overrides,
})

beforeEach(() => {
  database.clear()
  vi.mocked(get)
    .mockReset()
    .mockImplementation(async (key) => database.get(key as string) as never)
  vi.mocked(set)
    .mockReset()
    .mockImplementation(async (key, value) => {
      database.set(key as string, value)
    })
  vi.mocked(del)
    .mockReset()
    .mockImplementation(async (key) => {
      database.delete(key as string)
    })
})

describe('takePersistence', () => {
  test('should bring back a saved take', async () => {
    const take = createTake()

    await saveTake(take)
    const loaded = await loadTake()

    expect(loaded?.mimeType).toBe('audio/webm')
    expect(loaded?.recordedAt).toEqual(take.recordedAt)
    expect(loaded?.blob.size).toBe(3)
    expect(loaded?.blob.type).toBe('audio/webm')
  })

  test('should not repeat why the take stopped when it is reopened', async () => {
    await saveTake(createTake({ stopReason: 'interrupted' }))

    expect((await loadTake())?.stopReason).toBe('user')
  })

  test('should return null when nothing is saved', async () => {
    expect(await loadTake()).toBeNull()
  })

  test('should forget a deleted take', async () => {
    await saveTake(createTake())
    await deleteSavedTake()

    expect(await loadTake()).toBeNull()
  })

  test('should not let a slow save undo a delete made right after it', async () => {
    const slowTake = createTake()
    vi.spyOn(slowTake.blob, 'arrayBuffer').mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve(new ArrayBuffer(3)), 20),
        ),
    )

    void saveTake(slowTake)
    await deleteSavedTake()

    expect(await loadTake()).toBeNull()
  })

  test('should throw out a saved record it does not recognise', async () => {
    database.set('current', { bytes: 'not audio' })

    expect(await loadTake()).toBeNull()
    expect(database.has('current')).toBe(false)
  })

  describe('when storage fails', () => {
    const failure = new DOMException('blocked', 'SecurityError')

    test('should not throw when saving fails', async () => {
      vi.mocked(set).mockRejectedValue(failure)

      await expect(saveTake(createTake())).resolves.toBeUndefined()
    })

    test('should report no take when loading fails', async () => {
      vi.mocked(get).mockRejectedValue(failure)

      await expect(loadTake()).resolves.toBeNull()
    })

    test('should not throw when deleting fails', async () => {
      vi.mocked(del).mockRejectedValue(failure)

      await expect(deleteSavedTake()).resolves.toBeUndefined()
    })

    test('should handle a browser whose storage calls throw straight away', async () => {
      vi.mocked(set).mockImplementation(() => {
        throw new ReferenceError('indexedDB is not defined')
      })
      vi.mocked(get).mockImplementation(() => {
        throw new ReferenceError('indexedDB is not defined')
      })

      await expect(saveTake(createTake())).resolves.toBeUndefined()
      await expect(loadTake()).resolves.toBeNull()
    })

    test('should keep working after an earlier failure', async () => {
      vi.mocked(set).mockRejectedValueOnce(failure)

      await saveTake(createTake())
      await saveTake(createTake())

      expect((await loadTake())?.blob.size).toBe(3)
    })

    test('should keep the take when the browser refuses to persist', async () => {
      vi.stubGlobal('navigator', {
        storage: { persist: () => Promise.reject(failure) },
      })

      await saveTake(createTake())
      vi.unstubAllGlobals()

      expect((await loadTake())?.blob.size).toBe(3)
    })
  })
})
