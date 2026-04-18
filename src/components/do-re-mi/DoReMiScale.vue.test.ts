import { describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import DoReMiScale from './DoReMiScale.vue'
import { buildMajorScale, C3_MIDI } from '@/utils/noteUtils'

function createTestI18n() {
  return createI18n({ legacy: false, locale: 'en', messages: { en } })
}

describe('DoReMiScale', () => {
  test('should render without errors', () => {
    const i18n = createTestI18n()
    const wrapper = mount(DoReMiScale, {
      global: { plugins: [i18n] },
      props: {
        scaleSteps: buildMajorScale(C3_MIDI),
        currentStepIndex: 0,
        holdProgress: 0,
        isComplete: false,
        isStarted: false,
      },
    })
    expect(wrapper.exists()).toBe(true)
  })
})
