import type { ToneMode } from '@/composables/toneEngine'
import { useLocalStorage } from '@vueuse/core'
import { defineStore } from 'pinia'

const VALID_TONE_MODES = new Set<ToneMode>(['piano', 'bell', 'bass', 'square'])
const DEFAULT_TONE_MODE: ToneMode = 'piano'

export const useToneModeStore = defineStore('toneMode', () => {
  const toneMode = useLocalStorage<ToneMode>(
    'singing.toneMode',
    DEFAULT_TONE_MODE,
  )

  if (!VALID_TONE_MODES.has(toneMode.value)) {
    toneMode.value = DEFAULT_TONE_MODE
  }

  return { toneMode }
})
