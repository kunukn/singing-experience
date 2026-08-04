import { useLocalStorage } from '@vueuse/core'
import { DEFAULT_RANGE_INDEX, VOICE_RANGES } from '@/constants/voiceRanges'

/*
 * The order VOICE_RANGES shipped in while selections were persisted as plain
 * array indices. A stored number is resolved through this list once and then
 * rewritten as a labelKey, so an old saved selection survives the switch.
 * Never reorder or extend this — it describes the past, not the current list.
 */
const LEGACY_RANGE_ORDER = [
  'voiceRanges.full',
  'voiceRanges.tenorToSoprano',
  'voiceRanges.soprano',
  'voiceRanges.mezzoSoprano',
  'voiceRanges.alto',
  'voiceRanges.tenor',
  'voiceRanges.baritone',
  'voiceRanges.bass',
  'voiceRanges.kids',
  'voiceRanges.comfyWomen',
  'voiceRanges.everyone',
  'voiceRanges.comfyMen',
] as const

type VoiceRangeIndexOptions = {
  /* Restricts what can be selected — warm-up hides the full range. */
  allowedIndices?: readonly number[]
}

/*
 * Voice-range selection persisted by labelKey instead of array index, so
 * inserting or reordering entries in VOICE_RANGES can't silently change a
 * user's saved choice. Components keep working with an index.
 */
export function useVoiceRangeIndex(
  storageKey: string,
  options: VoiceRangeIndexOptions = {},
) {
  const defaultLabelKey = VOICE_RANGES[DEFAULT_RANGE_INDEX].labelKey
  const storedLabelKey = useLocalStorage(storageKey, defaultLabelKey)

  const resolveIndex = (stored: unknown): number => {
    const labelKey =
      typeof stored === 'string' && /^\d+$/.test(stored)
        ? LEGACY_RANGE_ORDER[Number(stored)]
        : stored
    const index = VOICE_RANGES.findIndex((range) => range.labelKey === labelKey)
    if (index === -1) return DEFAULT_RANGE_INDEX

    if (options.allowedIndices && !options.allowedIndices.includes(index))
      return DEFAULT_RANGE_INDEX

    return index
  }

  /* Normalise on load so legacy numeric values are rewritten as labelKeys. */
  storedLabelKey.value =
    VOICE_RANGES[resolveIndex(storedLabelKey.value)].labelKey

  return computed<number>({
    get: () => resolveIndex(storedLabelKey.value),
    set: (index) => {
      storedLabelKey.value = (
        VOICE_RANGES[index] ?? VOICE_RANGES[DEFAULT_RANGE_INDEX]
      ).labelKey
    },
  })
}
