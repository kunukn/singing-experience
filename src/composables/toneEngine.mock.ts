import { vi } from 'vitest'
import type { ToneEngine, ToneMode } from './toneEngine'

export function createMockToneEngine(
  overrides?: Partial<ToneEngine>,
): ToneEngine {
  const toneMode = ref<ToneMode>('piano')
  const isPlaying = ref(false)

  return {
    toneMode: readonly(toneMode),
    isPlaying: readonly(isPlaying),
    warmUp: vi.fn().mockResolvedValue(undefined),
    playTone: vi.fn().mockResolvedValue(undefined),
    setToneMode: vi.fn((mode: ToneMode) => {
      toneMode.value = mode
    }),
    ...overrides,
  }
}
