import ar from '@/locales/ar.json'
import da from '@/locales/da.json'
import en from '@/locales/en.json'
import es from '@/locales/es.json'
import hi from '@/locales/hi.json'
import zh from '@/locales/zh.json'
import { createI18n } from 'vue-i18n'

const savedLocale = localStorage.getItem('locale') ?? 'en'

export const i18n = createI18n({
  legacy: false,
  locale: savedLocale,
  messages: { en, zh, es, hi, ar, da },
})
