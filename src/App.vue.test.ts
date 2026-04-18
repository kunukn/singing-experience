import { describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { createRouter, createMemoryHistory } from 'vue-router'
import en from '@/locales/en.json'
import App from './App.vue'

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
      global: { plugins: [createPinia(), router, i18n] },
    })
    expect(wrapper.exists()).toBe(true)
  })
})
