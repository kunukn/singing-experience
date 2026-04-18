import { describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import PitchDisplay from './PitchDisplay.vue'

function createTestI18n() {
  return createI18n({ legacy: false, locale: 'en', messages: { en } })
}

describe('PitchDisplay', () => {
  test('should render without errors', () => {
    const i18n = createTestI18n()
    const wrapper = mount(PitchDisplay, {
      global: { plugins: [i18n] },
      props: {
        noteInfo: null,
        frequency: null,
        clarity: 0,
        isClean: false,
        isListening: false,
      },
    })
    expect(wrapper.exists()).toBe(true)
  })
})
