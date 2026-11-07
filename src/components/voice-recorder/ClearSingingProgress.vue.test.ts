import { describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import ClearSingingProgress from './ClearSingingProgress.vue'

function mountProgress(seconds: number) {
  return mount(ClearSingingProgress, {
    props: { seconds, targetSeconds: 15 },
    global: {
      plugins: [createI18n({ legacy: false, locale: 'en', messages: { en } })],
    },
  })
}

describe('ClearSingingProgress', () => {
  test('should show clear singing heard so far below the target', () => {
    const wrapper = mountProgress(9)

    expect(wrapper.attributes('data-ready')).toBe('false')
    expect(
      wrapper.get('[data-testid="recorder-clear-singing-text"]').text(),
    ).toBe('Clear singing 9/15 s')
    expect(wrapper.get('[role="status"]').text()).toBe('')
  })

  test('should say a rating is ready at the target and announce it', () => {
    const wrapper = mountProgress(15)

    expect(wrapper.attributes('data-ready')).toBe('true')
    expect(
      wrapper.get('[data-testid="recorder-clear-singing-text"]').text(),
    ).toBe('Ready for a rating')
    expect(wrapper.get('[role="status"]').text()).toBe('Ready for a rating')
  })
})
