import '@/_init.ts'
import { i18n } from '@/i18n'
import { createHead } from '@unhead/vue/client'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import 'primeicons/primeicons.css'
import { registerSW } from 'virtual:pwa-register'
import { createApp } from 'vue'
import {
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router'
import { handleHotUpdate, routes } from 'vue-router/auto-routes'
import App from './App.vue'
import './style.css'
import Theme from './theme'

registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return

    /*
     * autoUpdate swaps the SW and reloads the tab once a new build is
     * found, but an open tab only checks on navigation. Poll hourly so a
     * left-open tab also picks up a deploy without a manual reload.
     */
    setInterval(() => registration.update(), 60 * 60 * 1000)
  },
})

/*
  Hash history on github.io (static, no rewrite); HTML5 history on Vercel (syng.fun)
  where vercel.json rewrites all paths to /index.html. Selected at build time via
  VITE_USE_HISTORY_ROUTING (see vite.config.ts).
*/
const useHistory = import.meta.env.VITE_USE_HISTORY_ROUTING === '1'

const router = createRouter({
  history: useHistory
    ? createWebHistory(import.meta.env.BASE_URL)
    : createWebHashHistory(import.meta.env.BASE_URL),
  routes: [...routes, { path: '/warmup', redirect: '/warm-up' }],
})

if (import.meta.hot) {
  handleHotUpdate(router)
}

const app = createApp(App)

app
  .use(createHead())
  .use(createPinia())
  .use(router)
  .use(i18n)
  .use(PrimeVue, {
    theme: {
      preset: Theme,
      options: {
        /* App is always-dark; force PrimeVue dark color scheme unconditionally. */
        darkModeSelector: '.p-dark',
      },
    },
  })
  .mount('#app')

if (useHistory) {
  const { inject } = await import('@vercel/analytics')
  const { injectSpeedInsights } = await import('@vercel/speed-insights')
  inject()
  injectSpeedInsights()
}

self.app.useErrorToastStore = useErrorToastStore
self.app.useConfettiStore = useConfettiStore
// self.app.useErrorToastStore().addError(`This is a demo error toast. ${new Date().toLocaleTimeString()}`, {  persistent: true})
// self.app.useConfettiStore().fireConfetti()

if (import.meta.env.VITE_DEBUG_LOG === '1') {
  const { initLogger } = await import('@/utils/logger')
  initLogger()
}

if (import.meta.env.DEV || location.href.includes('debug_rainbow=1')) {
  import('@/utils/debugRainbow').then(({ initDebugRainbow }) =>
    initDebugRainbow(),
  )
}

try {
  const micPermission = await navigator.permissions.query({
    name: 'microphone' as PermissionName,
  })
  debugLog('App initialized', micPermission)
  if (micPermission.state === 'denied') {
    const { t } = i18n.global
    useErrorToastStore().addError(t('errors.microphoneDenied'), {
      persistent: true,
    })
  }
} catch {
  console.error('App initialized (Permissions API not supported)')
}
