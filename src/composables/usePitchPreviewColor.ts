import { withAlpha } from '@/utils/cssColor'
import { directionalTextColor } from '@/utils/pitchColors'

/*
 * The one colour rule for every idle "See your voice" preview, the same as
 * every other cents colour in the app: green when clean, yellow → red when
 * sharp, blue when flat. Uses the theme-aware text shades, which read on both
 * light and dark surfaces.
 *
 * Nearest-note cents flip sign halfway between two notes, so a slide turns
 * from warm to blue there. That is honest — sharp of the lower note, then flat
 * of the upper one — and one rule everywhere beats a flat note that looks
 * sharp.
 *
 * Callers decide *when* it applies (idle only, snap off, in range); this only
 * decides the colour.
 */
export function usePitchPreviewColor() {
  const { isDark } = useDarkMode()

  function colorForCents(cents: number, opacity = 1): string {
    return withAlpha(directionalTextColor(cents, isDark.value), opacity)
  }

  return { colorForCents }
}
