import { useLocalStorage } from '@vueuse/core'

import type { WavBitDepth } from './wavEncoder'

/*
 * Standard (16-bit) is CD quality and already quieter than a phone mic's own
 * hiss. Studio (24-bit) keeps more detail in very quiet singing, at 1.5 times
 * the size.
 */
export const RECORDING_BIT_DEPTHS: readonly WavBitDepth[] = [16, 24]
export const DEFAULT_RECORDING_BIT_DEPTH: WavBitDepth = 16

/* Most phones and laptops record at 48 kHz; some at 44.1 kHz. */
const TYPICAL_SAMPLE_RATE = 48000

const bitDepth = useLocalStorage<WavBitDepth>(
  'syng.voiceRecorderBitDepth',
  DEFAULT_RECORDING_BIT_DEPTH,
)

/* Heal a value persisted by an older or hand-edited build. */
if (!RECORDING_BIT_DEPTHS.includes(bitDepth.value)) {
  bitDepth.value = DEFAULT_RECORDING_BIT_DEPTH
}

export function useRecordingBitDepth() {
  return bitDepth
}

/* Rounded, for "about 6 MB a minute" style copy. */
export function megabytesPerMinute(bitsPerSample: WavBitDepth): number {
  return Math.round((TYPICAL_SAMPLE_RATE * (bitsPerSample / 8) * 60) / 1e6)
}
