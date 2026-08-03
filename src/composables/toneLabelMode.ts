/* Three-way tone-label display: hidden, plain note name (C), or with octave (C4). */
export type ToneLabelMode = 'off' | 'simple' | 'advanced'

/*
 * Derived display flags for a tone-label mode:
 *  - showLabels: whether any note-name label is drawn
 *  - showOctave: whether that label carries the octave digit (C4 vs C)
 */
export function toneLabelModeToFlags(mode: ToneLabelMode) {
  return { showLabels: mode !== 'off', showOctave: mode === 'advanced' }
}

/* SelectButton options: Off / C / C4. 'C'/'C4' are literal musical spellings
 * (no translation); only 'Off' is localized. */
export function useToneLabelModeOptions() {
  const { t } = useI18n()

  return computed(() => [
    { label: t('generic.off'), value: 'off' as ToneLabelMode },
    { label: 'C', value: 'simple' as ToneLabelMode },
    { label: 'C4', value: 'advanced' as ToneLabelMode },
  ])
}
