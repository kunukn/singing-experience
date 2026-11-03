import { describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import VoiceRangeExplorePanel from './VoiceRangeExplorePanel.vue'

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })

const mountPanel = () =>
  mount(VoiceRangeExplorePanel, {
    props: { liveMidi: null, isListening: true },
    global: { plugins: [i18n, PrimeVue] },
  })

describe('VoiceRangeExplorePanel', () => {
  test('should hide the famous singers until the toggle is on', () => {
    expect(mountPanel().find('[data-singer]').exists()).toBe(false)
  })

  test('should add and remove the famous singers with the toggle', async () => {
    const wrapper = mountPanel()
    const toggle = wrapper.get('input#voice-range-famous-singers')

    await toggle.trigger('change')

    expect(wrapper.find('[data-singer="elvisPresley"]').exists()).toBe(true)

    await toggle.trigger('change')

    expect(wrapper.find('[data-singer]').exists()).toBe(false)
  })
})
