import en from '@/locales/en.json'
import { createI18n } from 'vue-i18n'

type MessageSchema = typeof en

const localeModules = import.meta.glob('@/locales/*.json')

const savedLocale = localStorage.getItem('locale') ?? 'en'

export const i18n = createI18n({
  legacy: false,
  locale: savedLocale,
  fallbackLocale: 'en',
  messages: { en },
})

const loadedLocales = new Set<string>(['en'])

export async function loadLocaleMessages(locale: string): Promise<void> {
  if (loadedLocales.has(locale)) return

  const path = `/src/locales/${locale}.json`
  const loader = localeModules[path]
  if (!loader) return

  const messages = (await loader()) as { default: MessageSchema }
  i18n.global.setLocaleMessage(locale, messages.default)
  loadedLocales.add(locale)
}

/* Pre-load the saved locale so it's ready before the first render */
if (savedLocale !== 'en') {
  await loadLocaleMessages(savedLocale)
}
