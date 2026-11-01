import { useLocalStorage } from '@vueuse/core'
import {
  type MidiRange,
  normalizeVoiceRange,
} from '@/utils/normalizeVoiceRange'

export type VoiceRangeSlot = MidiRange & { name: string }

export const VOICE_RANGE_SLOT_COUNT = 3

/* Long enough for "Warm-up" or "Choir alto", short enough to fit a slot button */
export const VOICE_RANGE_SLOT_NAME_MAX_LENGTH = 20

function toSlot(value: unknown): VoiceRangeSlot | null {
  if (!value || typeof value !== 'object') return null

  const { midiMin, midiMax, name } = value as Record<string, unknown>

  return {
    ...normalizeVoiceRange(Number(midiMin), Number(midiMax)),
    name: String(name ?? '')
      .trim()
      .slice(0, VOICE_RANGE_SLOT_NAME_MAX_LENGTH),
  }
}

/**
 * Three saved ranges that set "My range" in one tap. Pure memory: they never
 * touch the mic or the finder. Every slot read is normalised like My range
 * itself, since the key can be edited from devtools or another tab.
 */
export function useVoiceRangeSlots(storageKey: string) {
  const storedSlots = useLocalStorage<unknown[]>(storageKey, [])

  const slots = computed<(VoiceRangeSlot | null)[]>(() => {
    const stored = Array.isArray(storedSlots.value) ? storedSlots.value : []

    return Array.from({ length: VOICE_RANGE_SLOT_COUNT }, (_, index) =>
      toSlot(stored[index]),
    )
  })

  function writeSlot(index: number, slot: VoiceRangeSlot | null) {
    if (index < 0 || index >= VOICE_RANGE_SLOT_COUNT) return

    storedSlots.value = slots.value.map((current, slotIndex) =>
      slotIndex === index ? toSlot(slot) : current,
    )
  }

  const saveSlot = (index: number, slot: VoiceRangeSlot) =>
    writeSlot(index, slot)
  const clearSlot = (index: number) => writeSlot(index, null)

  return { slots, saveSlot, clearSlot }
}
