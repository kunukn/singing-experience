import da from '@/locales/da.json'
import en from '@/locales/en.json'
import { createPinia } from 'pinia'
import { registerSW } from 'virtual:pwa-register'
import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import { createRouter, createWebHashHistory } from 'vue-router'
import { handleHotUpdate, routes } from 'vue-router/auto-routes'
import App from './App.vue'
import './style.css'

registerSW({ immediate: true })

const savedLocale = localStorage.getItem('locale') ?? 'en'

const i18n = createI18n({
  legacy: false,
  locale: savedLocale,
  messages: { en, da },
})

const router = createRouter({
  /*
    Hash history used for better compatibility with static file hosting, such as GitHub Pages.
    Update to your preferred history mode if needed.
  */
  history: createWebHashHistory(),
  routes,
})

if (import.meta.hot) {
  handleHotUpdate(router)
}

const app = createApp(App)

app.use(createPinia()).use(router).use(i18n).mount('#app')

if (import.meta.env.VITE_DEBUG_LOG === '1') {
  const { initLogger } = await import('@/utils/logger')
  initLogger()
}

if (import.meta.env.DEV || location.href.includes('debug_rainbow=1')) {
  import('@/utils/debugRainbow').then(({ initDebugRainbow }) =>
    initDebugRainbow(),
  )
}
