import {
  VOICE_RANGES,
  VOICE_RANGE_GROUP_ORDER,
  type VoiceRangeGroupId,
} from '@/constants/voiceRanges'

export type VoiceRangeOption = {
  /* Index into VOICE_RANGES — every consumer models the selection as an index. */
  value: number
  label: string
}

export type VoiceRangeGroup = {
  id: VoiceRangeGroupId
  label: string
  items: VoiceRangeOption[]
}

/**
 * The grouped options for a voice-range select, shared by every page that offers
 * one, so they can never disagree about which groups exist or their order.
 *
 * Empty groups are dropped, so a heading never renders with nothing under it.
 */
export function useVoiceRangeGroups() {
  const { t } = useI18n()

  return computed<VoiceRangeGroup[]>(() => {
    const entries = VOICE_RANGES.map((range, index) => ({ range, index }))

    return VOICE_RANGE_GROUP_ORDER.map((groupId) => ({
      id: groupId,
      label: t(`voiceRanges.groups.${groupId}`),
      items: entries
        .filter(({ range }) => range.group === groupId)
        .map(({ range, index }) => ({
          value: index,
          label: `${t(range.labelKey)} (${range.noteRange})`,
        })),
    })).filter((group) => group.items.length > 0)
  })
}
