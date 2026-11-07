import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import type { TakeAnalysis } from '@/components/voice-recorder/analyzeTake'
import {
  deleteSavedTake,
  loadTake,
  saveTake,
} from '@/components/voice-recorder/takePersistence'
import type { Take } from '@/components/voice-recorder/useVoiceRecorder'

import { useVoiceTakeStore } from './useVoiceTakeStore'

vi.mock('@/components/voice-recorder/takePersistence', () => ({
  saveTake: vi.fn(),
  loadTake: vi.fn(),
  deleteSavedTake: vi.fn(),
}))

const createTake = (): Take => ({
  blob: new Blob(['take']),
  mimeType: 'audio/webm',
  recordedAt: new Date(),
  stopReason: 'user',
  hasAutoGain: false,
  source: 'recorded',
})
const analysis = { durationMs: 1000 } as TakeAnalysis

describe('useVoiceTakeStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(saveTake).mockReset().mockResolvedValue()
    vi.mocked(deleteSavedTake).mockReset().mockResolvedValue()
    vi.mocked(loadTake).mockReset().mockResolvedValue(null)
  })

  test('should keep the take and its analysis', () => {
    const store = useVoiceTakeStore()
    const take = createTake()

    store.setTake(take)
    store.setAnalysis(analysis)

    expect(store.take).toBe(take)
    expect(store.analysis).toBe(analysis)
  })

  test('should drop the old analysis when a new take arrives', () => {
    const store = useVoiceTakeStore()

    store.setTake(createTake())
    store.setAnalysis(analysis)
    store.setTake(createTake())

    expect(store.analysis).toBeNull()
  })

  test('should drop the take and its analysis on clear', () => {
    const store = useVoiceTakeStore()

    store.setTake(createTake())
    store.setAnalysis(analysis)
    store.clear()

    expect(store.take).toBeNull()
    expect(store.analysis).toBeNull()
  })

  test('should save a new take and delete it on clear', () => {
    const store = useVoiceTakeStore()
    const take = createTake()

    store.setTake(take)
    expect(saveTake).toHaveBeenCalledWith(take)

    store.clear()
    expect(deleteSavedTake).toHaveBeenCalledTimes(1)
  })

  test('should keep the take in memory when saving never finishes', () => {
    vi.mocked(saveTake).mockReturnValue(new Promise(() => {}))
    const store = useVoiceTakeStore()
    const take = createTake()

    store.setTake(take)

    expect(store.take).toBe(take)
  })

  test('should restore a saved take', async () => {
    const saved = createTake()
    vi.mocked(loadTake).mockResolvedValue(saved)
    const store = useVoiceTakeStore()

    await store.restore()

    expect(store.take).toBe(saved)
  })

  test('should stay empty when there is nothing to restore', async () => {
    const store = useVoiceTakeStore()

    await store.restore()

    expect(store.take).toBeNull()
  })

  test('should only restore once per page load', async () => {
    const store = useVoiceTakeStore()

    await store.restore()
    await store.restore()

    expect(loadTake).toHaveBeenCalledTimes(1)
  })

  test('should not let a slow restore overwrite a new take', async () => {
    let finishLoading: (take: Take) => void = () => {}
    vi.mocked(loadTake).mockReturnValue(
      new Promise((resolve) => {
        finishLoading = resolve
      }),
    )
    const store = useVoiceTakeStore()
    const newTake = createTake()

    const restoring = store.restore()
    store.setTake(newTake)
    finishLoading(createTake())
    await restoring

    expect(store.take).toBe(newTake)
  })

  test('should not let a slow restore bring back a cleared take', async () => {
    let finishLoading: (take: Take) => void = () => {}
    vi.mocked(loadTake).mockReturnValue(
      new Promise((resolve) => {
        finishLoading = resolve
      }),
    )
    const store = useVoiceTakeStore()

    const restoring = store.restore()
    store.clear()
    finishLoading(createTake())
    await restoring

    expect(store.take).toBeNull()
  })
})
