import { withAlpha } from '@/utils/cssColor'
import { cleanTextColor, directionalTextColor } from '@/utils/pitchColors'

/*
 * The one colour rule for every idle "See your voice" preview: the same
 * green → yellow → red as the pitch-detector trail, keyed on cents from the
 * nearest note. Uses the theme-aware text shades — the trail's neon green is
 * unreadable on a light surface.
 *
 * directionalColorForCents is the variant for views that measure from a fixed
 * target (the pitch detector's Focus tab): flat turns blue, sharp stays warm.
 * Not for nearest-note cents, whose sign flips at every semitone.
 *
 * Callers decide *when* it applies (idle only, snap off, in range); this only
 * decides the colour.
 */
export function usePitchPreviewColor() {
  const { isDark } = useDarkMode()

  function colorForCents(cents: number, opacity = 1): string {
    return withAlpha(cleanTextColor(cents, isDark.value), opacity)
  }

  function directionalColorForCents(cents: number, opacity = 1): string {
    return withAlpha(directionalTextColor(cents, isDark.value), opacity)
  }

  return { colorForCents, directionalColorForCents }
}
