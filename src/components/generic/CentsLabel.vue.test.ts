import { describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import CentsLabel from './CentsLabel.vue'

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })

function mountLabel(cents: number | null) {
  return mount(CentsLabel, {
    props: { cents },
    global: { plugins: [i18n] },
  })
}

describe('CentsLabel', () => {
  test.each([
    { cents: 12, expected: '+12¢' },
    { cents: -12, expected: '-12¢' },
    { cents: 0, expected: '0¢' },
  ])('should show $cents cents as "$expected"', ({ cents, expected }) => {
    const wrapper = mountLabel(cents)

    expect(wrapper.text()).toBe(expected)
    expect(wrapper.attributes('data-cents')).toBe(String(cents))
  })

  test('should report no reading when there is no pitch', () => {
    const wrapper = mountLabel(null)

    expect(wrapper.attributes('data-cents')).toBe('none')
  })
})
