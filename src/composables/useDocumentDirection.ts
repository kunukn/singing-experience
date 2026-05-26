const RTL_LOCALES = new Set(['ar'])

export function useDocumentDirection() {
  const { locale } = useI18n()

  const applyDirection = (code: string) => {
    const el = document.documentElement
    el.dir = RTL_LOCALES.has(code) ? 'rtl' : 'ltr'
    el.lang = code
  }

  applyDirection(locale.value)
  watch(locale, applyDirection)
}

/* Reads the live <html dir> value. Stays in sync with locale changes via the
 * watcher in useDocumentDirection, which runs once at app start. */
export function useIsRtl() {
  const { locale } = useI18n()
  const isRtl = ref(document.documentElement.dir === 'rtl')

  watch(locale, () => {
    nextTick(() => {
      isRtl.value = document.documentElement.dir === 'rtl'
    })
  })

  return isRtl
}
