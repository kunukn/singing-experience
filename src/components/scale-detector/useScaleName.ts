import { keyAccidentalStyle, pitchClassLabel } from '@/utils/scaleDetection'
import {
  SCALE_HIGHLIGHT_MODES,
  type ScaleHighlightMode,
} from '@/utils/scaleHighlight'

/*
 * Names a scale as "C Major" / "B♭ Lydian", spelling the root the way the
 * scale itself is written. Word order comes from the locale, so a language
 * that puts the mode first can.
 */
export function useScaleName() {
  const { t } = useI18n()
  const groups = useScaleModeGroups(SCALE_HIGHLIGHT_MODES)
  const modeLabels = computed(
    () =>
      new Map(
        groups.value
          .flatMap((group) => group.items)
          .map((option) => [option.id, option.label]),
      ),
  )

  function scaleName(root: number, mode: ScaleHighlightMode): string {
    return t('scaleDetector.scaleName', {
      root: pitchClassLabel(root, keyAccidentalStyle(root, mode)),
      mode: modeLabels.value.get(mode) ?? mode,
    })
  }

  return { scaleName }
}
