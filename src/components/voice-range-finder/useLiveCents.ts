import { neutralDirectionalTextColor } from '@/utils/pitchColors'
import { centsOffNearest } from './useRangeFinder'

/* Cents within this of the note read as 0¢. A held note jitters by a few
 * cents in the detector, and nobody hears 2¢, so the readout would only
 * flicker -1¢, 0¢, +2¢. Display only: whether a note counts as clean is
 * still decided from the exact pitch (useRangeFinder). */
const CENTS_DEAD_ZONE = 2

export const toleratedCents = (cents: number) =>
  Math.abs(cents) <= CENTS_DEAD_ZONE ? 0 : cents

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

    return value === null
      ? null
      : toleratedCents(Math.round(centsOffNearest(value)))
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
