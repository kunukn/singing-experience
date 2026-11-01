import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import VoiceRangeSlots from './VoiceRangeSlots.vue'

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })

const STORAGE_KEY = 'syng.voiceRangeSlots'

const EXPANDED_KEY = 'syng.voiceRangeSlotsExpanded'

const G2 = 43
const E4 = 64
const A2 = 45
const D4 = 62

/* attachTo: isVisible() only sees v-show's display:none on an attached element */
function mountSlots(midiMin = A2, midiMax = D4) {
  return mount(VoiceRangeSlots, {
    props: { midiMin, midiMax },
    attachTo: document.body,
    /* The dialog teleports to <body>; render it in place so the wrapper finds it */
    global: { plugins: [i18n, PrimeVue], stubs: { teleport: true } },
  })
}

type SlotsWrapper = ReturnType<typeof mountSlots>

const slotButton = (wrapper: SlotsWrapper, number: number) =>
  wrapper.get(`[data-testid="range-slot-${number}"]`)

describe('VoiceRangeSlots', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    localStorage.clear()
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([{ midiMin: G2, midiMax: E4, name: 'Warm-up' }, null]),
    )
  })

  test('should show filled and empty slots', () => {
    const wrapper = mountSlots()

    expect(slotButton(wrapper, 1).text()).toContain('Warm-up')
    expect(slotButton(wrapper, 1).text()).toContain('G2–E4')
    expect(slotButton(wrapper, 2).text()).toContain('Slot 2')
    expect(slotButton(wrapper, 2).text()).toContain('Empty')
  })

  test('should apply a filled slot', async () => {
    const wrapper = mountSlots()

    await slotButton(wrapper, 1).trigger('click')

    expect(wrapper.emitted('applyRange')).toEqual([
      [{ midiMin: G2, midiMax: E4 }],
    ])
  })

  test('should mark the slot that matches My range', () => {
    const wrapper = mountSlots(G2, E4)

    expect(slotButton(wrapper, 1).attributes('data-active')).toBe('true')
    expect(slotButton(wrapper, 2).attributes('data-active')).toBe('false')
  })

  test('should open the editor for an empty slot and save My range into it', async () => {
    const wrapper = mountSlots()

    await slotButton(wrapper, 2).trigger('click')

    expect(wrapper.emitted('applyRange')).toBeUndefined()
    expect(wrapper.find('[data-testid="range-slot-clear"]').exists()).toBe(
      false,
    )

    await wrapper.get('[data-testid="range-slot-name"]').setValue('Choir')
    await wrapper.get('[data-testid="range-slot-save"]').trigger('click')

    expect(slotButton(wrapper, 2).text()).toContain('Choir')
    expect(slotButton(wrapper, 2).text()).toContain('A2–D4')
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')[1]).toEqual({
      midiMin: A2,
      midiMax: D4,
      name: 'Choir',
    })
  })

  /* Enter in the name field submits the form natively; the test fires that
   * submit directly since the DOM shim doesn't do implicit submission. */
  test('should save when the editor form is submitted', async () => {
    const wrapper = mountSlots()

    await wrapper.get('[data-testid="range-slot-edit-1"]').trigger('click')
    await wrapper.get('[data-testid="range-slot-name"]').setValue('Stretch')
    await wrapper.get('[data-testid="range-slot-form"]').trigger('submit')

    expect(wrapper.find('[data-testid="range-slot-form"]').exists()).toBe(false)
    expect(slotButton(wrapper, 1).text()).toContain('Stretch')
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')[0].name).toBe(
      'Stretch',
    )
  })

  test('should clear a slot from its editor', async () => {
    const wrapper = mountSlots()

    await wrapper.get('[data-testid="range-slot-edit-1"]').trigger('click')
    await wrapper.get('[data-testid="range-slot-clear"]').trigger('click')

    expect(slotButton(wrapper, 1).text()).toContain('Empty')
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')[0]).toBeNull()
  })

  describe('collapsing', () => {
    const toggle = (wrapper: SlotsWrapper) =>
      wrapper.get('[data-testid="range-slots-toggle"]')
    const isListVisible = (wrapper: SlotsWrapper) =>
      wrapper.get('[data-testid="range-slots-list"]').isVisible()

    afterEach(() => {
      vi.restoreAllMocks()
    })

    test('should start open on a wide screen', () => {
      const wrapper = mountSlots()

      expect(toggle(wrapper).attributes('aria-expanded')).toBe('true')
      expect(isListVisible(wrapper)).toBe(true)
    })

    test('should start collapsed on a phone', () => {
      vi.spyOn(window, 'matchMedia').mockImplementation(
        (query) =>
          ({
            matches: query.includes('max-width'),
            media: query,
            addEventListener: () => {},
            removeEventListener: () => {},
          }) as unknown as MediaQueryList,
      )
      const wrapper = mountSlots()

      expect(toggle(wrapper).attributes('aria-expanded')).toBe('false')
      expect(isListVisible(wrapper)).toBe(false)
    })

    test('should remember the toggle across mounts', async () => {
      const wrapper = mountSlots()

      await toggle(wrapper).trigger('click')

      expect(isListVisible(wrapper)).toBe(false)
      expect(localStorage.getItem(EXPANDED_KEY)).toBe('closed')
      expect(toggle(mountSlots()).attributes('aria-expanded')).toBe('false')
    })

    test('should name the matching slot while collapsed', () => {
      localStorage.setItem(EXPANDED_KEY, 'closed')
      const wrapper = mountSlots(G2, E4)

      const summary = wrapper.get('[data-testid="range-slots-summary"]')
      expect(summary.text()).toContain('Warm-up')
      expect(summary.text()).toContain('G2–E4')
    })

    test('should show no summary when no slot matches', () => {
      localStorage.setItem(EXPANDED_KEY, 'closed')
      const wrapper = mountSlots()

      expect(wrapper.find('[data-testid="range-slots-summary"]').exists()).toBe(
        false,
      )
    })
  })
})
