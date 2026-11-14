import { describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import GraceKellyPartRange from './GraceKellyPartRange.vue'

const G2 = 43
const G3 = 55
const G5 = 79

const mountRange = (midiMin: number, midiMax: number) =>
  mount(GraceKellyPartRange, {
    props: { midiMin, midiMax },
    global: {
      plugins: [createI18n({ legacy: false, locale: 'en', messages: { en } })],
    },
  })

describe('GraceKellyPartRange', () => {
  test('should show the tones and how wide the range is', () => {
    const wrapper = mountRange(G2, G5)

    expect(
      wrapper.find('[data-testid="grace-kelly-part-range-tones"]').text(),
    ).toBe('G2–G5')
    expect(
      wrapper.find('[data-testid="voice-range-width-semitones"]').text(),
    ).toBe('36 semitones')
    expect(
      wrapper.find('[data-testid="voice-range-width-octaves"]').text(),
    ).toBe('3 octaves')
  })

  test('should show one tone and no width when the range is a single tone', () => {
    const wrapper = mountRange(G3, G3)

    expect(
      wrapper.find('[data-testid="grace-kelly-part-range-tones"]').text(),
    ).toBe('G3')
    expect(wrapper.find('[data-testid="voice-range-width"]').exists()).toBe(
      false,
    )
  })
})
