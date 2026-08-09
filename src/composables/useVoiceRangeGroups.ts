import {
  VOICE_RANGES,
  VOICE_RANGE_GROUP_ORDER,
  type VoiceRangeGroupId,
} from '@/constants/voiceRanges'
import { midiToNoteLabel } from '@/utils/noteUtils'

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

export type VoiceRangeGroupsOptions = {
  /* Restricts what can be offered — warm-up hides the full range. */
  allowedIndices?: readonly number[]
  /* 'span' shows the whole range ("C3–C5"); 'startNote' only its lowest note. */
  noteLabelMode?: 'span' | 'startNote'
}

/**
 * The grouped options for a voice-range select, shared by every page that offers
 * one, so they can never disagree about which groups exist or their order.
 *
 * Groups left empty by `allowedIndices` are dropped, so a subset never renders a
 * heading with nothing under it.
 */
export function useVoiceRangeGroups(
  options: VoiceRangeGroupsOptions | (() => VoiceRangeGroupsOptions) = {},
) {
  const { t } = useI18n()

  return computed<VoiceRangeGroup[]>(() => {
    const { allowedIndices, noteLabelMode = 'span' } = toValue(options)

    const entries = VOICE_RANGES.map((range, index) => ({
      range,
      index,
    })).filter(({ index }) => !allowedIndices || allowedIndices.includes(index))

    return VOICE_RANGE_GROUP_ORDER.map((groupId) => ({
      id: groupId,
      label: t(`voiceRanges.groups.${groupId}`),
      items: entries
        .filter(({ range }) => range.group === groupId)
        .map(({ range, index }) => {
          const noteLabel =
            noteLabelMode === 'startNote'
              ? midiToNoteLabel(range.midiMin).label
              : range.noteRange

          return { value: index, label: `${t(range.labelKey)} (${noteLabel})` }
        }),
    })).filter((group) => group.items.length > 0)
  })
}
