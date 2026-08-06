import {
  SCALE_HIGHLIGHT_MODES,
  scaleModeEnglishLabel,
  type ScaleHighlightMode,
} from '@/utils/scaleHighlight'

export type ScaleModeOptionItem = {
  id: ScaleHighlightMode
  label: string
}

/**
 * The options for the scale-mode select, shared by the guitar and the piano —
 * the two held a byte-identical computed before this.
 *
 * Two kinds of name live in this list and they are not treated alike. Major,
 * Minor, Pentatonic and Blues have real native words that differ meaningfully
 * (Dur/Mol, 大调, Мажор), so they carry locale keys. The modal and exotic names
 * are proper nouns every language transliterates, so they carry none and fall
 * back to English — which is what keeps a new mode down to one line in
 * SCALE_HIGHLIGHT_MODES instead of 15 locale files.
 */
export function useScaleModeOptions() {
  const { t, te } = useI18n()

  return computed<ScaleModeOptionItem[]>(() =>
    SCALE_HIGHLIGHT_MODES.map((id) => {
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
      return { id, label: te(key, 'en') ? t(key) : scaleModeEnglishLabel(id) }
    }),
  )
}
