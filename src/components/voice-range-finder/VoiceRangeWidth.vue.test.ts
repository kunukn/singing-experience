import { describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import da from '@/locales/da.json'
import en from '@/locales/en.json'
import VoiceRangeWidth from './VoiceRangeWidth.vue'

const G2 = 43
const D4 = 62

const mountWidth = (midiMin: number, midiMax: number, locale = 'en') =>
  mount(VoiceRangeWidth, {
    props: { midiMin, midiMax },
    global: {
      plugins: [createI18n({ legacy: false, locale, messages: { en, da } })],
    },
  })

describe('VoiceRangeWidth', () => {
  test.each([
    { midiMin: G2, midiMax: D4, expected: '19 semitones · 1.6 octaves' },
    { midiMin: 48, midiMax: 60, expected: '12 semitones · 1 octave' },
    { midiMin: 48, midiMax: 72, expected: '24 semitones · 2 octaves' },
  ])(
    'should read "$expected" for $midiMin–$midiMax',
    ({ midiMin, midiMax, expected }) => {
      expect(mountWidth(midiMin, midiMax).text()).toBe(expected)
    },
  )

  test('should put semitones and octaves on a line each when stacked', () => {
    const wrapper = mount(VoiceRangeWidth, {
      props: { midiMin: G2, midiMax: D4, isStacked: true },
      global: {
        plugins: [
          createI18n({ legacy: false, locale: 'en', messages: { en, da } }),
        ],
      },
    })

    expect(
      wrapper.find('[data-testid="voice-range-width-semitones"]').text(),
    ).toBe('19 semitones')
    expect(
      wrapper.find('[data-testid="voice-range-width-octaves"]').text(),
    ).toBe('1.6 octaves')
  })

  test('should format the octaves for the language', () => {
    expect(mountWidth(G2, D4, 'da').text()).toBe('19 halvtoner · 1,6 oktaver')
  })
})
