import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import { RANGE_FINDER_HOLD_MS } from './useRangeFinder'
import VoiceRangeFinderDisplay from './VoiceRangeFinderDisplay.vue'

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })

const G2_HZ = 98

const D3_HZ = 146.83

const { isPreviewEnabled } = useSettings()

function mountDisplay() {
  const frequency = ref<number | null>(null)
  const isListening = ref(false)
  const detection = {
    frequency,
    isClean: ref(true),
    isListening,
    error: ref<string | null>(null),
    start: vi.fn(() => {
      isListening.value = true
    }),
    stop: vi.fn(() => {
      isListening.value = false
    }),
  }
  const wrapper = mount(VoiceRangeFinderDisplay, {
    props: { detection, simulateIdlePreview: true },
    global: { plugins: [i18n, PrimeVue] },
  })

  return { wrapper, frequency, detection }
}

const liveLinesOf = (wrapper: ReturnType<typeof mountDisplay>['wrapper']) =>
  wrapper.findAll('[data-testid="voice-type-comparison-live-line"]')

describe('VoiceRangeFinderDisplay', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    isPreviewEnabled.value = false
  })

  describe('See your voice', () => {
    test('should draw the sung note on the chart while idle', async () => {
      isPreviewEnabled.value = true
      const { wrapper, frequency } = mountDisplay()

      frequency.value = D3_HZ
      await nextTick()

      expect(liveLinesOf(wrapper).length).toBeGreaterThan(0)
    })

    test('should hide the line and stop listening when switched off', async () => {
      isPreviewEnabled.value = true
      const { wrapper, frequency, detection } = mountDisplay()
      frequency.value = D3_HZ
      await nextTick()

      isPreviewEnabled.value = false
      await nextTick()

      expect(detection.stop).toHaveBeenCalled()
      expect(liveLinesOf(wrapper)).toHaveLength(0)
    })

    test('should keep the detector running when a search starts', async () => {
      isPreviewEnabled.value = true
      const { wrapper, detection } = mountDisplay()
      await nextTick()

      await wrapper
        .get('[data-testid="voice-range-finder-start"]')
        .trigger('click')
      await nextTick()

      expect(detection.stop).not.toHaveBeenCalled()
      expect(detection.isListening.value).toBe(true)
    })
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

    const centsMeter = () => wrapper.get('[data-testid="cents-meter"]')
    expect(centsMeter().attributes('data-visible')).toBe('false')

    vi.advanceTimersByTime(1000)
    await nextTick()

    expect(centsMeter().attributes('data-visible')).toBe('true')
    expect(stepSection().attributes('data-record-flash')).toBe('false')
    expect(
      wrapper.find('[data-testid="voice-range-finder-record-tick"]').exists(),
    ).toBe(false)
  })

  test('should save the low end when the high step is skipped', async () => {
    const { wrapper, frequency } = mountDisplay()
    const done = () => wrapper.get('[data-testid="voice-range-finder-done"]')

    await wrapper
      .get('[data-testid="voice-range-finder-start"]')
      .trigger('click')
    frequency.value = G2_HZ
    vi.advanceTimersByTime(RANGE_FINDER_HOLD_MS + 100)
    await nextTick()
    await done().trigger('click')
    frequency.value = null
    await nextTick()

    expect(
      wrapper
        .get('[data-testid="voice-range-finder-step"]')
        .attributes('data-step'),
    ).toBe('high')
    expect(done().attributes('disabled')).toBeUndefined()

    await done().trigger('click')

    expect(
      wrapper.find('[data-testid="voice-range-finder-step"]').exists(),
    ).toBe(false)
    expect(
      wrapper.get('[data-testid="my-range-notes"]').text().startsWith('G2'),
    ).toBe(true)
    expect(wrapper.find('[data-testid="my-range-saved"]').exists()).toBe(true)
  })

  test('should skip the low step but not save from nothing', async () => {
    const { wrapper } = mountDisplay()
    const done = () => wrapper.get('[data-testid="voice-range-finder-done"]')

    await wrapper
      .get('[data-testid="voice-range-finder-start"]')
      .trigger('click')
    await done().trigger('click')

    expect(
      wrapper
        .get('[data-testid="voice-range-finder-step"]')
        .attributes('data-step'),
    ).toBe('high')
    expect(done().attributes('disabled')).toBeDefined()
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
