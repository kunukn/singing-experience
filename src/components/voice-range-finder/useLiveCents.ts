import { directionalTextColor } from '@/utils/pitchColors'
import { centsOffNearest } from './useRangeFinder'

/* Cents within this of the note show as "about zero". A held note jitters
 * by a few cents in the detector, and nobody hears 2¢, so the readout would
 * only flicker -1¢, 0¢, +2¢. Display only: whether a note counts as clean is
 * still decided from the exact pitch (useRangeFinder). */
const CENTS_DEAD_ZONE = 2

/* Signed whole cents, "+12¢" / "-7¢" / "0¢": the sign says which way to move */
export const formatSignedCents = (cents: number) =>
  cents > 0 ? `+${cents}¢` : `${cents}¢`

/* Inside the dead zone the cents text reads ≈0¢: "0¢" would claim a
 * precision the wobbling line beside it disproves, and an empty label came
 * and went on every wobble, shifting the note name beside it. No "-": that
 * is the flat sign. */
const NEAR_ZERO_CENTS_TEXT = '≈0¢'

export const centsLabel = (cents: number) =>
  Math.abs(cents) <= CENTS_DEAD_ZONE
    ? NEAR_ZERO_CENTS_TEXT
    : formatSignedCents(cents)

/**
 * How far a live, fractional MIDI note sits from its nearest semitone, as the
 * number, its text and its colour (grey when clean, blue when flat, warm when
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
