import { beforeEach, describe, expect, test, vi } from 'vitest'

import { del, get, set } from 'idb-keyval'

import type { PitchTake } from './pitchLaneRecorder'
import {
  deleteSavedPitchTake,
  loadPitchTake,
  savePitchTake,
} from './pitchTakePersistence'

const database = new Map<string, unknown>()

vi.mock('idb-keyval', () => ({
  createStore: vi.fn(() => 'store'),
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
}))

const createTake = (overrides: Partial<PitchTake> = {}): PitchTake => ({
  lanes: {
    low: {
      samples: [{ midiNote: 60.2, timestamp: 100, isClean: true, cents: 20 }],
      noteMarkers: [
        { midiNote: 60, timestamp: 100, label: 'C4', showLabel: true },
      ],
    },
    high: { samples: [], noteMarkers: [] },
  },
  stoppedAtMs: 200,
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

describe('pitchTakePersistence', () => {
  test('should bring back a saved take', async () => {
    const take = createTake()

    await savePitchTake(take)

    expect(await loadPitchTake()).toEqual(take)
  })

  test('should return null when nothing is saved', async () => {
    expect(await loadPitchTake()).toBeNull()
  })

  test('should forget a deleted take', async () => {
    await savePitchTake(createTake())
    await deleteSavedPitchTake()

    expect(await loadPitchTake()).toBeNull()
  })

  test.each([
    ['not an object', 'nonsense'],
    ['no stop time', { ...createTake(), stoppedAtMs: undefined }],
    [
      'a missing lane',
      { ...createTake(), lanes: { low: createTake().lanes.low } },
    ],
    [
      'a broken sample',
      {
        ...createTake(),
        lanes: {
          low: { samples: [{ midiNote: 'C' }], noteMarkers: [] },
          high: { samples: [], noteMarkers: [] },
        },
      },
    ],
    [
      'no samples at all',
      {
        ...createTake(),
        lanes: {
          low: { samples: [], noteMarkers: [] },
          high: { samples: [], noteMarkers: [] },
        },
      },
    ],
  ])('should delete a saved record with %s', async (_name, record) => {
    database.set('current', record)

    expect(await loadPitchTake()).toBeNull()
    expect(database.has('current')).toBe(false)
  })

  test('should not let a slow save undo a later delete', async () => {
    let finishSave = () => {}
    vi.mocked(set).mockImplementationOnce(async (key, value) => {
      await new Promise<void>((resolve) => {
        finishSave = resolve
      })
      database.set(key as string, value)
    })

    const saved = savePitchTake(createTake())
    const deleted = deleteSavedPitchTake()
    await vi.waitFor(() => expect(set).toHaveBeenCalled())
    finishSave()
    await Promise.all([saved, deleted])

    expect(database.has('current')).toBe(false)
  })

  test('should not throw when storage fails', async () => {
    vi.mocked(set).mockRejectedValue(new Error('full'))
    vi.mocked(get).mockRejectedValue(new Error('blocked'))
    vi.mocked(del).mockRejectedValue(new Error('blocked'))

    await expect(savePitchTake(createTake())).resolves.toBeUndefined()
    await expect(loadPitchTake()).resolves.toBeNull()
    await expect(deleteSavedPitchTake()).resolves.toBeUndefined()
  })
})
