import { beforeEach, describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import VoiceRangeSlots from './VoiceRangeSlots.vue'

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })

const STORAGE_KEY = 'syng.voiceRangeSlots'

const G2 = 43
const E4 = 64
const A2 = 45
const D4 = 62

function mountSlots(midiMin = A2, midiMax = D4) {
  return mount(VoiceRangeSlots, {
    props: { midiMin, midiMax },
    /* The dialog teleports to <body>; render it in place so the wrapper finds it */
    global: { plugins: [i18n, PrimeVue], stubs: { teleport: true } },
  })
}

type SlotsWrapper = ReturnType<typeof mountSlots>

const slotButton = (wrapper: SlotsWrapper, number: number) =>
  wrapper.get(`[data-testid="range-slot-${number}"]`)

describe('VoiceRangeSlots', () => {
  beforeEach(() => {
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

  test('should clear a slot from its editor', async () => {
    const wrapper = mountSlots()

    await wrapper.get('[data-testid="range-slot-edit-1"]').trigger('click')
    await wrapper.get('[data-testid="range-slot-clear"]').trigger('click')

    expect(slotButton(wrapper, 1).text()).toContain('Empty')
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')[0]).toBeNull()
  })
})
