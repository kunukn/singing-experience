import { beforeEach, describe, expect, test } from 'vitest'
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

const STORAGE_KEY = 'syng.voiceRangeFamousSingers'

describe('VoiceRangeExplorePanel', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('should remember the toggle across mounts', async () => {
    await mountPanel().get('input#voice-range-famous-singers').trigger('change')

    expect(localStorage.getItem(STORAGE_KEY)).toBe('true')
    expect(mountPanel().find('[data-singer="elvisPresley"]').exists()).toBe(
      true,
    )
  })

  test('should remember the toggle being turned back off', async () => {
    localStorage.setItem(STORAGE_KEY, 'true')

    await mountPanel().get('input#voice-range-famous-singers').trigger('change')

    expect(localStorage.getItem(STORAGE_KEY)).toBe('false')
    expect(mountPanel().find('[data-singer]').exists()).toBe(false)
  })

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
