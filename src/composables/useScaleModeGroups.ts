import {
  buildScaleModeGroups,
  type ScaleMode,
  type ScaleModeGroup,
} from '@/utils/noteUtils'

/**
 * The grouped options for a scale-mode select, shared by the guitar, the piano
 * and Do-Re-Mi — every scale dropdown in the app is built from this, so the three
 * can never disagree about which groups exist or what order they come in.
 *
 * Pass `modes` to show a subset (the instruments show the 17 legible ones in
 * SCALE_HIGHLIGHT_MODES); omit it for the full catalogue.
 *
 * Two kinds of name live in this list and they are not treated alike. Major,
 * Minor, Pentatonic and Blues have real native words that differ meaningfully
 * (Dur/Mol, 大调, Мажор), so they carry locale keys. The modal and exotic names
 * are proper nouns every language transliterates, so they carry none and fall
 * back to the catalogue's English — which is what keeps a new mode down to one
 * line in noteUtils instead of 15 locale files. Group headings are ordinary
 * words, so those are always translated.
 */
export function useScaleModeGroups(modes?: readonly ScaleMode[]) {
  const { t, te } = useI18n()

  return computed<ScaleModeGroup[]>(() =>
    buildScaleModeGroups({
      modes,
      groupLabel: (groupId) => t(`scale.scaleModeGroups.${groupId}`),
      modeLabel: ({ id, label }) => {
        const key = `scale.scaleModes.${id}`

        /*
         * te(key, 'en'), not te(key). Bare te tests only the ACTIVE locale, so a
         * mode translated in en.json but missing from da.json would report false
         * in Danish and drop to the English fallback here — silently bypassing
         * vue-i18n's own fallbackLocale chain (see i18n.ts). Testing the English
         * catalogue instead asks the question we actually mean — "does this mode
         * have curated copy at all?" — and leaves t() to resolve with its normal
         * fallback. Invisible while every locale carries every key; wrong the
         * moment one doesn't.
         */
        return te(key, 'en') ? t(key) : label
      },
    }),
  )
}

/** The translated name of a single mode, for captions outside the select. */
export function useScaleModeLabel(mode: MaybeRefOrGetter<ScaleMode>) {
  const groups = useScaleModeGroups()

  return computed(() => {
    const id = toValue(mode)

    return (
      groups.value
        .flatMap((group) => group.items)
        .find((option) => option.id === id)?.label ?? id
    )
  })
}
