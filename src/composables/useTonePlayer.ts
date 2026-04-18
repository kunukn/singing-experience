export type { ToneMode } from './toneEngine'
import { defaultToneEngine } from './toneEngine'

export function useTonePlayer() {
  return defaultToneEngine
}
