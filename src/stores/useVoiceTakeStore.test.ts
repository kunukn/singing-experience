import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import type { TakeAnalysis } from '@/components/voice-recorder/analyzeTake'
import type { Take } from '@/components/voice-recorder/useVoiceRecorder'

import { useVoiceTakeStore } from './useVoiceTakeStore'

const createTake = (): Take => ({
  blob: new Blob(['take']),
  mimeType: 'audio/webm',
  recordedAt: new Date(),
  stopReason: 'user',
  hasAutoGain: false,
})
const analysis = { durationMs: 1000 } as TakeAnalysis

describe('useVoiceTakeStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
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
})
