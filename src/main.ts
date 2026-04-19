import '@/_init.ts'
import { i18n } from '@/i18n'
import { createPinia } from 'pinia'
import { registerSW } from 'virtual:pwa-register'
import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import { handleHotUpdate, routes } from 'vue-router/auto-routes'
import App from './App.vue'
import './style.css'

registerSW({ immediate: true })

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
