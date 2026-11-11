import { describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import type { MidiRange } from '@/utils/normalizeVoiceRange'
import VoiceRangeResult from './VoiceRangeResult.vue'

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })

const C3 = 48
const G3 = 55
const C4 = 60

function mountResult(sungRange: MidiRange, foundRange: MidiRange) {
  return mount(VoiceRangeResult, {
    props: { sungRange, foundRange },
    global: { plugins: [i18n, PrimeVue] },
  })
}

const widenedNote = (wrapper: ReturnType<typeof mountResult>) =>
  wrapper.find('[data-testid="voice-range-finder-widened"]')

const width = (wrapper: ReturnType<typeof mountResult>) =>
  wrapper.find('[data-testid="voice-range-width"]')

describe('VoiceRangeResult', () => {
  test('should show the sung range without a widened note when saved as sung', () => {
    const range = { midiMin: C3, midiMax: C4 }
    const wrapper = mountResult(range, range)

    expect(wrapper.text()).toContain('You sang C3–C4')
    expect(widenedNote(wrapper).exists()).toBe(false)
  })

  test('should say how wide a range saved as sung is', () => {
    const range = { midiMin: C3, midiMax: C4 }
    const wrapper = mountResult(range, range)

    expect(width(wrapper).text()).toBe('12 semitones · 1 octave')
  })

  test('should leave the width out when the sung range was too short', () => {
    const wrapper = mountResult(
      { midiMin: C3, midiMax: G3 },
      { midiMin: C3, midiMax: C4 },
    )

    expect(width(wrapper).exists()).toBe(false)
  })

  test('should name the octave it will save when the sung range was too short', () => {
    const wrapper = mountResult(
      { midiMin: C3, midiMax: G3 },
      { midiMin: C3, midiMax: C4 },
    )

    expect(wrapper.text()).toContain('You sang C3–G3')
    expect(widenedNote(wrapper).text()).toContain('C3–C4')
  })

  test('should emit use and tryAgain from its buttons', async () => {
    const range = { midiMin: C3, midiMax: C4 }
    const wrapper = mountResult(range, range)

    await wrapper.get('[data-testid="voice-range-finder-use"]').trigger('click')
    await wrapper
      .get('[data-testid="voice-range-finder-try-again"]')
      .trigger('click')

    expect(wrapper.emitted('use')).toHaveLength(1)
    expect(wrapper.emitted('tryAgain')).toHaveLength(1)
  })
})
