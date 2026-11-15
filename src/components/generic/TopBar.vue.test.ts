import { describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createMemoryHistory, createRouter } from 'vue-router'
import en from '@/locales/en.json'
import TopBar from './TopBar.vue'

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })

const page = { template: '<div />' }

async function mountAt(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: page, meta: { isLandingPage: true } },
      { path: '/:pathMatch(.*)*', component: page },
    ],
  })
  router.push(path)
  await router.isReady()

  return mount(TopBar, {
    shallow: true,
    global: { plugins: [i18n, router] },
  })
}

describe('TopBar', () => {
  test.each(['/', '/games', '/note-rush', '/sing-tone'])(
    'should link to the best scores on %s',
    async (path) => {
      const wrapper = await mountAt(path)

      expect(wrapper.findComponent({ name: 'RecordsButton' }).exists()).toBe(
        true,
      )
    },
  )

  test.each(['/tools', '/tuner', '/records'])(
    'should not link to the best scores on %s',
    async (path) => {
      const wrapper = await mountAt(path)

      expect(wrapper.findComponent({ name: 'RecordsButton' }).exists()).toBe(
        false,
      )
    },
  )
})
