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
    routes: [
      { path: '/', component: { template: '<div>Home</div>' } },
      {
        path: '/catalogue',
        meta: { ambientBackground: true },
        component: { template: '<div>Catalogue</div>' },
      },
    ],
  })
}

function createTestI18n() {
  return createI18n({ legacy: false, locale: 'en', messages: { en } })
}

async function mountAt(path: string) {
  const router = createTestRouter()
  await router.push(path)
  await router.isReady()

  return mount(App, {
    global: {
      plugins: [
        createHead(),
        createPinia(),
        router,
        createTestI18n(),
        [PrimeVue, { theme: { preset: Theme } }],
      ],
    },
  })
}

describe('App', () => {
  test('should render without errors', async () => {
    const wrapper = await mountAt('/')
    expect(wrapper.exists()).toBe(true)
  })

  test('should show the wave backdrop on a page that opts in', async () => {
    const wrapper = await mountAt('/catalogue')
    expect(wrapper.find('[data-testid="ambient-waves"]').exists()).toBe(true)
  })

  test('should not show the wave backdrop on other pages', async () => {
    const wrapper = await mountAt('/')
    expect(wrapper.find('[data-testid="ambient-waves"]').exists()).toBe(false)
  })
})
