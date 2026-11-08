import { VOZ_LABEL_KEYS } from '@/components/grace-kelly/graceKellyConstants'
import type { HighScoreConfig } from '@/stores/useHighScoreStore'
import { formatSeconds } from '@/utils/highScoreFormat'

/* Chip order on the records page: what was played first, then how hard. */
const FIELD_ORDER = [
  'songId',
  'vozIndex',
  'scaleMode',
  'direction',
  'difficulty',
  'rounds',
  'durationSec',
  'speed',
  'bpm',
  'holdSec',
  'melodyGuide',
  'pitchSnap',
]

/*
 * Turns a best score's settings into short chip labels, using only keys the
 * games already translate, so the records page adds no new copy. Settings are
 * keyed by name, and the names are shared across games (difficulty, holdSec),
 * so one map covers every game.
 */
export function useHighScoreLabels() {
  const { t, locale } = useI18n()
  const scaleModeGroups = useScaleModeGroups()

  function scaleModeLabel(id: string) {
    return (
      scaleModeGroups.value
        .flatMap((group) => group.items)
        .find((option) => option.id === id)?.label ?? id
    )
  }

  /* Two decimals: hold options go down to 0.05s */
  function settingSeconds(value: string | number | boolean) {
    return formatSeconds(Number(value) * 1000, locale.value, 2)
  }

  function describeField(name: string, value: string | number | boolean) {
    switch (name) {
      case 'difficulty':
        return t(`generic.difficulty_${value}`)
      case 'holdSec':
        return `${t('generic.holdDuration')} ${settingSeconds(value)}`
      case 'durationSec':
        return `${t('generic.gameLength')} ${settingSeconds(value)}`
      case 'rounds':
        return `${t('singTone.rounds')} ${value}`
      case 'scaleMode':
        return scaleModeLabel(String(value))
      case 'songId':
        return t(`singTheKeys.songs.${value}`)
      case 'speed':
        return `${t('singTheKeys.speed')} ${value}×`
      case 'vozIndex':
        return t(`graceKelly.vozLabels.${VOZ_LABEL_KEYS[Number(value)]}`)
      case 'bpm':
        return `${value} BPM`
      case 'direction':
        return value === 'clockwise'
          ? t('circleOfFifths.directionFifths')
          : t('circleOfFifths.directionFourths')
      case 'melodyGuide':
        return value ? t('generic.melodyGuide') : null
      case 'pitchSnap':
        return value ? t('generic.pitchSnap') : null
      default:
        return `${name} ${value}`
    }
  }

  function describeConfig(config: HighScoreConfig) {
    return Object.keys(config)
      .toSorted((a, b) => FIELD_ORDER.indexOf(a) - FIELD_ORDER.indexOf(b))
      .flatMap((name) => describeField(name, config[name]) ?? [])
  }

  return { describeConfig }
}
