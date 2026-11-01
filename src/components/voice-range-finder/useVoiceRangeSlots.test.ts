import { beforeEach, describe, expect, test } from 'vitest'
import { DEFAULT_MY_VOICE_RANGE } from '@/utils/normalizeVoiceRange'
import {
  useVoiceRangeSlots,
  VOICE_RANGE_SLOT_COUNT,
  VOICE_RANGE_SLOT_NAME_MAX_LENGTH,
} from './useVoiceRangeSlots'

const G2 = 43
const E4 = 64

describe('useVoiceRangeSlots', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  /* A distinct key per case: useLocalStorage keeps writing back what an
   * earlier call on the same key persisted. */
  test('should start with every slot empty', () => {
    const { slots } = useVoiceRangeSlots('test.slots.empty')

    expect(slots.value).toEqual(Array(VOICE_RANGE_SLOT_COUNT).fill(null))
  })

  test('should save, persist and clear a slot', async () => {
    const key = 'test.slots.roundTrip'
    const { slots, saveSlot, clearSlot } = useVoiceRangeSlots(key)

    saveSlot(1, { midiMin: G2, midiMax: E4, name: ' Warm-up ' })
    await nextTick() // useLocalStorage writes on the next flush

    expect(slots.value[1]).toEqual({
      midiMin: G2,
      midiMax: E4,
      name: 'Warm-up',
    })
    expect(JSON.parse(localStorage.getItem(key) ?? '[]')[1]).toEqual({
      midiMin: G2,
      midiMax: E4,
      name: 'Warm-up',
    })

    clearSlot(1)

    expect(slots.value[1]).toBeNull()
  })

  test('should ignore an index outside the slots', () => {
    const { slots, saveSlot } = useVoiceRangeSlots('test.slots.outside')

    saveSlot(VOICE_RANGE_SLOT_COUNT, { midiMin: G2, midiMax: E4, name: '' })

    expect(slots.value).toEqual(Array(VOICE_RANGE_SLOT_COUNT).fill(null))
  })

  test('should repair a hand-edited store', () => {
    const key = 'test.slots.repair'
    localStorage.setItem(
      key,
      JSON.stringify([
        { midiMin: E4, midiMax: G2, name: 'x'.repeat(50) }, // reversed, long name
        'nonsense',
        { midiMin: 60, midiMax: 62 }, // narrower than an octave
        { midiMin: G2, midiMax: E4, name: 'extra' }, // a fourth slot
      ]),
    )

    const { slots } = useVoiceRangeSlots(key)

    expect(slots.value).toHaveLength(VOICE_RANGE_SLOT_COUNT)
    expect(slots.value[0]).toEqual({
      midiMin: G2,
      midiMax: E4,
      name: 'x'.repeat(VOICE_RANGE_SLOT_NAME_MAX_LENGTH),
    })
    expect(slots.value[1]).toBeNull()
    expect(slots.value[2]).toEqual({ midiMin: 60, midiMax: 72, name: '' })
  })

  test('should fall back to the default range for non-numbers', () => {
    const key = 'test.slots.nonNumbers'
    localStorage.setItem(key, JSON.stringify([{ midiMin: 'low', name: 'A' }]))

    const { slots } = useVoiceRangeSlots(key)

    expect(slots.value[0]).toEqual({ ...DEFAULT_MY_VOICE_RANGE, name: 'A' })
  })

  test('should read a store that is not an array as empty', () => {
    const key = 'test.slots.notArray'
    localStorage.setItem(key, JSON.stringify({ midiMin: G2 }))

    const { slots } = useVoiceRangeSlots(key)

    expect(slots.value).toEqual(Array(VOICE_RANGE_SLOT_COUNT).fill(null))
  })
})
