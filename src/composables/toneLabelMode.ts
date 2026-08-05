import { useLocalStorage } from '@vueuse/core'

/* Three-way tone-label display: hidden, plain note name (C), or with octave (C4). */
export type ToneLabelMode = 'off' | 'simple' | 'advanced'

const TONE_LABEL_MODES: readonly ToneLabelMode[] = ['off', 'simple', 'advanced']

export function isToneLabelMode(value: unknown): value is ToneLabelMode {
  return TONE_LABEL_MODES.includes(value as ToneLabelMode)
}

/*
 * Tone-label mode persisted per page, with anything unrecognised resolved back
 * to the caller's default. useLocalStorage hands back whatever the key holds,
 * and an unknown value is worse than useless here: every consumer tests for
 * 'off' and 'advanced' by equality, so a junk mode silently renders as
 * 'simple' rather than falling back. Mirrors useVoiceRangeIndex — the stored
 * value is repaired on load, and the getter stays defensive against a write
 * from outside the app afterwards.
 */
export function useToneLabelMode(
  storageKey: string,
  defaultMode: ToneLabelMode,
) {
  const storedMode = useLocalStorage<ToneLabelMode>(storageKey, defaultMode)

  if (!isToneLabelMode(storedMode.value)) storedMode.value = defaultMode

  return computed<ToneLabelMode>({
    get: () =>
      isToneLabelMode(storedMode.value) ? storedMode.value : defaultMode,
    set: (mode) => {
      storedMode.value = mode
    },
  })
}

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
