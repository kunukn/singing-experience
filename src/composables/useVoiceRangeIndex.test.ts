import { beforeEach, describe, expect, test } from 'vitest'
import { DEFAULT_RANGE_INDEX, VOICE_RANGES } from '@/constants/voiceRanges'
import { useVoiceRangeIndex } from './useVoiceRangeIndex'

const STORAGE_KEY = 'test.rangeIndex'

const indexOfLabelKey = (labelKey: string) =>
  VOICE_RANGES.findIndex((range) => range.labelKey === labelKey)

describe('useVoiceRangeIndex', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('falls back to the default when nothing is stored', () => {
    expect(useVoiceRangeIndex(STORAGE_KEY).value).toBe(DEFAULT_RANGE_INDEX)
  })

  test('resolves a stored labelKey to its current index', () => {
    localStorage.setItem(STORAGE_KEY, 'voiceRanges.bass')

    expect(useVoiceRangeIndex(STORAGE_KEY).value).toBe(
      indexOfLabelKey('voiceRanges.bass'),
    )
  })

  test('persists the labelKey, not the index', async () => {
    const rangeIndex = useVoiceRangeIndex(STORAGE_KEY)
    rangeIndex.value = indexOfLabelKey('voiceRanges.duet')
    await nextTick()

    expect(localStorage.getItem(STORAGE_KEY)).toBe('voiceRanges.duet')
  })

  /* Legacy numeric index 10 = 'voiceRanges.everyone' in the shipped order. */
  test('migrates a legacy numeric index to its labelKey', async () => {
    localStorage.setItem(STORAGE_KEY, '10')
    const rangeIndex = useVoiceRangeIndex(STORAGE_KEY)
    await nextTick()

    expect(VOICE_RANGES[rangeIndex.value].labelKey).toBe('voiceRanges.everyone')
    expect(localStorage.getItem(STORAGE_KEY)).toBe('voiceRanges.everyone')
  })

  test('falls back to the default for an unknown stored value', () => {
    localStorage.setItem(STORAGE_KEY, 'voiceRanges.removedLongAgo')

    expect(useVoiceRangeIndex(STORAGE_KEY).value).toBe(DEFAULT_RANGE_INDEX)
  })

  test('rejects a stored range outside allowedIndices', () => {
    localStorage.setItem(STORAGE_KEY, 'voiceRanges.full')
    const allowedIndices = VOICE_RANGES.map((_, index) => index).filter(
      (index) => VOICE_RANGES[index].labelKey !== 'voiceRanges.full',
    )

    expect(useVoiceRangeIndex(STORAGE_KEY, { allowedIndices }).value).toBe(
      DEFAULT_RANGE_INDEX,
    )
  })

  /* The stored value belongs to every feature sharing the key, so a narrower
   * allowedIndices must filter what this caller reads without rewriting it. */
  test('does not overwrite a shared stored value that falls outside allowedIndices', async () => {
    localStorage.setItem(STORAGE_KEY, 'voiceRanges.full')
    const allowedIndices = VOICE_RANGES.map((_, index) => index).filter(
      (index) => VOICE_RANGES[index].labelKey !== 'voiceRanges.full',
    )

    const rangeIndex = useVoiceRangeIndex(STORAGE_KEY, { allowedIndices })
    await nextTick()

    expect(rangeIndex.value).toBe(DEFAULT_RANGE_INDEX)
    expect(localStorage.getItem(STORAGE_KEY)).toBe('voiceRanges.full')
  })

  /* A fallback outside allowedIndices renders a blank select, since the option
   * list is built from the same subset. */
  test('falls back to an allowed range when the default itself is not allowed', () => {
    localStorage.setItem(STORAGE_KEY, 'voiceRanges.full')
    const allowedIndices = [
      indexOfLabelKey('voiceRanges.alto'),
      indexOfLabelKey('voiceRanges.tenor'),
    ]

    const rangeIndex = useVoiceRangeIndex(STORAGE_KEY, { allowedIndices })

    expect(allowedIndices).toContain(rangeIndex.value)
  })
})
