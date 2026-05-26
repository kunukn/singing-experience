import type { ToneMode } from '@/composables/toneEngine'
import { useLocalStorage } from '@vueuse/core'

const VALID_TONE_MODES = new Set<ToneMode>([
  'keyboard',
  'bell',
  'bass',
  'square',
  'tuning',
  'tuning2',
])
const DEFAULT_TONE_MODE: ToneMode = 'bell'

export const useToneModeStore = defineStore('toneMode', () => {
  const toneMode = useLocalStorage<ToneMode>('syng.toneMode', DEFAULT_TONE_MODE)

  if (!VALID_TONE_MODES.has(toneMode.value)) {
    toneMode.value = DEFAULT_TONE_MODE
  }

  return { toneMode }
})
