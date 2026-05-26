import en from '@/locales/en.json'
import { createHead } from '@unhead/vue/client'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import { describe, expect, test } from 'vitest'
import { createI18n } from 'vue-i18n'
import { createMemoryHistory, createRouter } from 'vue-router'
import App from './App.vue'
import Theme from './theme'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: { template: '<div>Home</div>' } }],
  })
}

function createTestI18n() {
  return createI18n({ legacy: false, locale: 'en', messages: { en } })
}

describe('App', () => {
  test('should render without errors', () => {
    const router = createTestRouter()
    const i18n = createTestI18n()
    const wrapper = mount(App, {
      global: {
        plugins: [
          createHead(),
          createPinia(),
          router,
          i18n,
          [PrimeVue, { theme: { preset: Theme } }],
        ],
      },
    })
    expect(wrapper.exists()).toBe(true)
  })
})
