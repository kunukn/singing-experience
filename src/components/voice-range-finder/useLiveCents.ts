import { neutralDirectionalTextColor } from '@/utils/pitchColors'
import { centsOffNearest } from './useRangeFinder'

/* Signed whole cents, "+12¢" / "-7¢" / "0¢": the sign says which way to move */
export const formatSignedCents = (cents: number) =>
  cents > 0 ? `+${cents}¢` : `${cents}¢`

/**
 * How far a live, fractional MIDI note sits from its nearest semitone, as the
 * number, its text and its colour (grey when clean, blue when flat, warm when
 * sharp). All three are empty while silent.
 */
export function useLiveCents(midi: MaybeRefOrGetter<number | null>) {
  const { isDark } = useDarkMode()

  const liveCents = computed(() => {
    const value = toValue(midi)

    return value === null ? null : Math.round(centsOffNearest(value))
  })
  const liveCentsText = computed(() =>
    liveCents.value === null ? '' : formatSignedCents(liveCents.value),
  )
  const liveCentsColor = computed(() =>
    liveCents.value === null
      ? undefined
      : neutralDirectionalTextColor(liveCents.value, isDark.value),
  )

  return { liveCents, liveCentsText, liveCentsColor }
}
