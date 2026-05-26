import { useLocalStorage } from '@vueuse/core'

/* Pitch clean-tone gate. Higher = stricter (rejects breath/decay); lower =
 * accepts softer/breathier singing. See usePitchDetection.ts for the full
 * rationale behind the 0.9 default. */
export const DEFAULT_CLARITY_THRESHOLD = 0.9
export const MIN_CLARITY_THRESHOLD = 0.4
export const MAX_CLARITY_THRESHOLD = 1
export const CLARITY_STEP = 0.01

/* "See your voice" idle preview. Shared across every feature and the global
 * SettingsPanel via one localStorage key. */
export const DEFAULT_PREVIEW_ENABLED = false

const clarityThreshold = useLocalStorage(
  'syng.clarityThreshold',
  DEFAULT_CLARITY_THRESHOLD,
)

const isPreviewEnabled = useLocalStorage(
  'syng.previewEnabled',
  DEFAULT_PREVIEW_ENABLED,
)

/* Heal an out-of-range value persisted by an older/edited build. */
if (
  clarityThreshold.value < MIN_CLARITY_THRESHOLD ||
  clarityThreshold.value > MAX_CLARITY_THRESHOLD
) {
  clarityThreshold.value = DEFAULT_CLARITY_THRESHOLD
}

export function useSettings() {
  function resetToDefaults() {
    clarityThreshold.value = DEFAULT_CLARITY_THRESHOLD
    isPreviewEnabled.value = DEFAULT_PREVIEW_ENABLED
  }

  return { clarityThreshold, isPreviewEnabled, resetToDefaults }
}
