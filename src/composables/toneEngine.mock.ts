import { vi } from 'vitest'
import type { ToneEngine, ToneMode } from './toneEngine'

export function createMockToneEngine(
  overrides?: Partial<ToneEngine>,
): ToneEngine {
  const toneMode = ref<ToneMode>('keyboard')
  const isPlaying = ref(false)

  /* Virtual audio clock advanced by `setMockNow`. Lets tests reason about
   * scheduleDraw timing without depending on Tone.js internals. */
  let mockNow = 0
  const drawTimers: ReturnType<typeof setTimeout>[] = []

  return {
    toneMode: readonly(toneMode),
    isPlaying: readonly(isPlaying),
    warmUp: vi.fn().mockResolvedValue(undefined),
    playTone: vi.fn().mockResolvedValue(undefined),
    playToneAt: vi.fn(),
    playClickAt: vi.fn(),
    playBellFeedback: vi.fn().mockResolvedValue(undefined),
    setToneMode: vi.fn((mode: ToneMode) => {
      toneMode.value = mode
    }),
    getNow: vi.fn(() => mockNow),
    scheduleDraw: vi.fn((callback: () => void, whenS: number) => {
      const delayMs = Math.max(0, (whenS - mockNow) * 1000)
      const timer = setTimeout(callback, delayMs)
      drawTimers.push(timer)
    }),
    cancelScheduled: vi.fn(() => {
      while (drawTimers.length > 0) {
        clearTimeout(drawTimers.pop())
      }
    }),
    setHarmonyVoiceCount: vi.fn(),
    playHarmonyVoiceAt: vi.fn(),
    ...overrides,
  }
}
