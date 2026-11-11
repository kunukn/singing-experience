import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'
import { createI18n } from 'vue-i18n'
import { createMemoryHistory, createRouter } from 'vue-router'
import en from '@/locales/en.json'
import { RANGE_FINDER_HOLD_MS } from './useRangeFinder'
import VoiceRangeFinderDisplay from './VoiceRangeFinderDisplay.vue'

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })

const G2_HZ = 98

const D3_HZ = 146.83

const { isPreviewEnabled } = useSettings()

async function createTestRouter() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: { template: '<div />' } }],
  })
  await router.push('/')

  return router
}

async function mountDisplay() {
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
    global: { plugins: [i18n, PrimeVue, await createTestRouter()] },
  })

  return { wrapper, frequency, detection }
}

type DisplayWrapper = Awaited<ReturnType<typeof mountDisplay>>['wrapper']

const liveLinesOf = (wrapper: DisplayWrapper) =>
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
      const { wrapper, frequency } = await mountDisplay()

      frequency.value = D3_HZ
      await nextTick()

      expect(liveLinesOf(wrapper).length).toBeGreaterThan(0)
    })

    test('should hide the line and stop listening when switched off', async () => {
      isPreviewEnabled.value = true
      const { wrapper, frequency, detection } = await mountDisplay()
      frequency.value = D3_HZ
      await nextTick()

      isPreviewEnabled.value = false
      await nextTick()

      expect(detection.stop).toHaveBeenCalled()
      expect(liveLinesOf(wrapper)).toHaveLength(0)
    })

    test('should keep the detector running when a search starts', async () => {
      isPreviewEnabled.value = true
      const { wrapper, detection } = await mountDisplay()
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
    const { wrapper, frequency } = await mountDisplay()

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

    /* Scoped to the step: the hidden Explore panel has its own meter */
    const centsMeter = () => stepSection().get('[data-testid="cents-meter"]')
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
    const { wrapper, frequency } = await mountDisplay()
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
    const { wrapper } = await mountDisplay()
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
    const { wrapper, frequency } = await mountDisplay()
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

  test('should set My range from a saved slot and mark it', async () => {
    const A2 = 45
    const E4 = 64
    localStorage.setItem(
      'syng.voiceRangeSlots',
      JSON.stringify([{ midiMin: A2, midiMax: E4, name: 'Choir' }]),
    )
    const { wrapper } = await mountDisplay()
    const slot = () => wrapper.get('[data-testid="range-slot-1"]')

    await slot().trigger('click')

    expect(wrapper.get('[data-testid="my-range-notes"]').text()).toContain(
      'A2–E4',
    )
    expect(
      wrapper
        .get('[data-testid="my-range-card"]')
        .get('[data-testid="voice-range-width"]')
        .text(),
    ).toBe('19 semitones · 1.6 octaves')
    expect(wrapper.find('[data-testid="my-range-saved"]').exists()).toBe(true)
    expect(slot().attributes('data-active')).toBe('true')

    localStorage.removeItem('syng.voiceRangeSlots')
  })

  describe('Explore tab', () => {
    const openExplore = (wrapper: DisplayWrapper) =>
      wrapper
        .get('[data-testid="voice-range-finder-tab-explore"]')
        .trigger('click')

    test('should show the live note without the My range card', async () => {
      isPreviewEnabled.value = true
      const { wrapper, frequency } = await mountDisplay()

      await openExplore(wrapper)
      frequency.value = D3_HZ
      await nextTick()

      const explore = wrapper.get('[data-testid="voice-range-explore"]')
      expect(
        explore.get('[data-testid="voice-range-explore-note"]').text(),
      ).toBe('D3')
      expect(
        explore
          .findAll('[data-testid="voice-type-comparison-row"]')
          .some((row) => row.attributes('data-sounding') === 'true'),
      ).toBe(true)
      expect(explore.find('[data-testid="my-range-highest"]').exists()).toBe(
        false,
      )
    })

    test('should cancel a running search when switching tabs', async () => {
      const { wrapper, detection } = await mountDisplay()

      await wrapper
        .get('[data-testid="voice-range-finder-start"]')
        .trigger('click')
      expect(detection.isListening.value).toBe(true)

      await openExplore(wrapper)
      await flushPromises()

      expect(detection.stop).toHaveBeenCalled()
      expect(
        wrapper.find('[data-testid="voice-range-finder-step"]').exists(),
      ).toBe(false)
    })
  })
})
