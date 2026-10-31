import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import { RANGE_FINDER_HOLD_MS } from './useRangeFinder'
import VoiceRangeFinderDisplay from './VoiceRangeFinderDisplay.vue'

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })

const G2_HZ = 98

function mountDisplay() {
  const frequency = ref<number | null>(null)
  const detection = {
    frequency,
    isClean: ref(true),
    isListening: ref(true),
    error: ref<string | null>(null),
    start: () => {},
    stop: () => {},
  }
  const wrapper = mount(VoiceRangeFinderDisplay, {
    props: { detection },
    global: { plugins: [i18n, PrimeVue] },
  })

  return { wrapper, frequency }
}

describe('VoiceRangeFinderDisplay', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  test('should flash a ✓ when a hold sets a record, then return to live', async () => {
    const { wrapper, frequency } = mountDisplay()

    await wrapper
      .get('[data-testid="voice-range-finder-start"]')
      .trigger('click')
    frequency.value = G2_HZ
    vi.advanceTimersByTime(RANGE_FINDER_HOLD_MS + 100)
    await nextTick()

    const stepSection = () =>
      wrapper.get('[data-testid="voice-range-finder-step"]')
    expect(stepSection().attributes('data-record-flash')).toBe('true')
    expect(
      wrapper.find('[data-testid="voice-range-finder-record-tick"]').exists(),
    ).toBe(true)
    expect(
      wrapper.get('[data-testid="voice-range-finder-record"]').text(),
    ).toBe('Lowest so far: G2')

    vi.advanceTimersByTime(1000)
    await nextTick()

    expect(stepSection().attributes('data-record-flash')).toBe('false')
    expect(
      wrapper.find('[data-testid="voice-range-finder-record-tick"]').exists(),
    ).toBe(false)
  })

  test('should show a ✓ beside the range after a sung save, then hide it', async () => {
    const { wrapper, frequency } = mountDisplay()
    const savedTick = () => wrapper.find('[data-testid="my-range-saved"]')

    await wrapper.get('[data-testid="my-range-sing-lowest"]').trigger('click')
    frequency.value = G2_HZ
    vi.advanceTimersByTime(RANGE_FINDER_HOLD_MS + 100)
    await nextTick()
    await wrapper
      .get('[data-testid="voice-range-finder-done"]')
      .trigger('click')

    expect(wrapper.get('[data-testid="my-range-notes"]').text()).toContain('G2')
    expect(savedTick().exists()).toBe(true)

    vi.advanceTimersByTime(2000)
    await nextTick()

    expect(savedTick().exists()).toBe(false)
  })
})
