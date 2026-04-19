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
