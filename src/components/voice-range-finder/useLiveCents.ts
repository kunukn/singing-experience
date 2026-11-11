import { directionalTextColor } from '@/utils/pitchColors'
import { isNearZeroCents, NEAR_ZERO_CENTS_TEXT } from '@/utils/centsText'
import { centsOffNearest } from './useRangeFinder'

/* Signed whole cents, "+12¢" / "-7¢" / "0¢": the sign says which way to move */
export const formatSignedCents = (cents: number) =>
  cents > 0 ? `+${cents}¢` : `${cents}¢`

/* The dead zone shared with CentsLabel (centsText.ts), as plain text for the
 * labels here that are built as strings */
export const centsLabel = (cents: number) =>
  isNearZeroCents(cents) ? NEAR_ZERO_CENTS_TEXT : formatSignedCents(cents)

/**
 * How far a live, fractional MIDI note sits from its nearest semitone, as the
 * number, its text and its colour (green when clean, blue when flat, warm when
 * sharp). All three are empty while silent. Within 2¢ the text reads ≈0¢,
 * while the number (and the meter it drives) stays exact.
 */
export function useLiveCents(midi: MaybeRefOrGetter<number | null>) {
  const { isDark } = useDarkMode()

  const liveCents = computed(() => {
    const value = toValue(midi)

    return value === null ? null : Math.round(centsOffNearest(value))
  })
  const liveCentsText = computed(() =>
    liveCents.value === null ? '' : centsLabel(liveCents.value),
  )
  const liveCentsColor = computed(() =>
    liveCents.value === null
      ? undefined
      : directionalTextColor(liveCents.value, isDark.value),
  )

  return { liveCents, liveCentsText, liveCentsColor }
}
