import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import type { PitchTake } from '@/components/pitch-detector/pitchLaneRecorder'
import {
  deleteSavedPitchTake,
  loadPitchTake,
  savePitchTake,
} from '@/components/pitch-detector/pitchTakePersistence'

import { usePitchTakeStore } from './usePitchTakeStore'

vi.mock('@/components/pitch-detector/pitchTakePersistence', () => ({
  savePitchTake: vi.fn(),
  loadPitchTake: vi.fn(),
  deleteSavedPitchTake: vi.fn(),
}))

const createTake = (): PitchTake => ({
  lanes: {
    low: {
      samples: [{ midiNote: 60, timestamp: 100, isClean: true, cents: 0 }],
      noteMarkers: [],
    },
    high: { samples: [], noteMarkers: [] },
  },
  stoppedAtMs: 200,
})

/* A load that finishes only when the test says so. */
function holdLoad() {
  let finish: (take: PitchTake | null) => void = () => {}
  vi.mocked(loadPitchTake).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve
    }),
  )

  return (take: PitchTake | null) => finish(take)
}

describe('usePitchTakeStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(savePitchTake).mockReset().mockResolvedValue()
    vi.mocked(deleteSavedPitchTake).mockReset().mockResolvedValue()
    vi.mocked(loadPitchTake).mockReset().mockResolvedValue(null)
  })

  test('should keep a new take and save a copy', () => {
    const store = usePitchTakeStore()
    const take = createTake()

    store.setTake(take)

    expect(store.take).toBe(take)
    expect(savePitchTake).toHaveBeenCalledWith(take)
  })

  test('should drop the take and its saved copy on clear', () => {
    const store = usePitchTakeStore()

    store.setTake(createTake())
    store.clear()

    expect(store.take).toBeNull()
    expect(deleteSavedPitchTake).toHaveBeenCalledOnce()
  })

  test('should bring back a saved take', async () => {
    const store = usePitchTakeStore()
    const saved = createTake()
    vi.mocked(loadPitchTake).mockResolvedValue(saved)

    await store.restore()

    expect(store.take).toBe(saved)
  })

  test('should load from storage only once per page load', async () => {
    const store = usePitchTakeStore()

    await store.restore()
    await store.restore()

    expect(loadPitchTake).toHaveBeenCalledOnce()
  })

  test('should not let a slow restore overwrite a newer take', async () => {
    const store = usePitchTakeStore()
    const finishLoad = holdLoad()
    const newer = createTake()

    const restoring = store.restore()
    store.setTake(newer)
    finishLoad(createTake())
    await restoring

    expect(store.take).toBe(newer)
  })

  test('should not let a slow restore undo a clear', async () => {
    const store = usePitchTakeStore()
    const finishLoad = holdLoad()

    const restoring = store.restore()
    store.clear()
    finishLoad(createTake())
    await restoring

    expect(store.take).toBeNull()
  })
})
