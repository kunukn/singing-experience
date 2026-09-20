import { VOICE_RANGES } from '@/constants/voiceRanges'
import { midiToNoteLabel } from '@/utils/noteUtils'
import { octaveStopColor } from '@/utils/pitchColors'
import {
  getSegmentsForRange,
  type VoiceTypeSegment,
} from '@/utils/voiceRangeSegments'

/* A visible voice type with everything a bar or a key row needs to draw it. */
export type DecoratedVoiceTypeSegment = VoiceTypeSegment & {
  color: string
  name: string
  /* "Soprano, C4–C6" — the accessible name for a bar or a legend row. */
  spanLabel: string
  /* "C4–C6" alone, for a row that already shows the name in its own column. */
  noteSpan: string
  /* "75%" — how much of the voice the range covers, or null for a range that
   * names its voices instead of measuring them. */
  coveragePercent: string | null
  isSelected: boolean
}

export type VoiceTypeSegmentsOptions = {
  /* Index into VOICE_RANGES — picks which voices are visible, and marks the
   * chosen one when the selection happens to be one of the six types. */
  rangeIndex: number
  midiMin: number
  midiMax: number
}

/**
 * The voice types inside a selected range, decorated with their colour and
 * labels. The ribbon beside the chart axis and the legend that names its bars
 * both read from here, so the two can never disagree about which voices are on
 * screen, what they are called, or which one is selected.
 */
export function useVoiceTypeSegments(
  options: VoiceTypeSegmentsOptions | (() => VoiceTypeSegmentsOptions),
) {
  const { t } = useI18n()
  const { isDark } = useDarkMode()

  return computed<DecoratedVoiceTypeSegment[]>(() => {
    const { rangeIndex, midiMin, midiMax } = toValue(options)
    const selectedLabelKey = VOICE_RANGES[rangeIndex]?.labelKey ?? null

    return getSegmentsForRange(rangeIndex, midiMin, midiMax).map((segment) => {
      const name = t(segment.labelKey)
      const from = midiToNoteLabel(segment.midiFrom).label
      const to = midiToNoteLabel(segment.midiTo).label
      const percent =
        segment.coverage == null ? null : Math.round(segment.coverage * 100)

      return Object.assign({}, segment, {
        color: octaveStopColor(segment.stopIndex, isDark.value),
        name,
        /* The accessible name carries the coverage the row shows, so a screen
         * reader hears what a sighted user reads. */
        spanLabel:
          percent == null
            ? t('generic.voiceTypeSpan', { name, from, to })
            : t('generic.voiceTypeSpanCoverage', { name, from, to, percent }),
        /* Composed in code rather than translated: note names are the same in
         * every locale, the way VOICE_RANGES builds its own noteRange. */
        noteSpan: `${from}–${to}`,
        coveragePercent: percent == null ? null : `${percent}%`,
        isSelected: segment.labelKey === selectedLabelKey,
      })
    })
  })
}
