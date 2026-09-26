import { describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import PianoDisplay from './PianoDisplay.vue'

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })

/* C4–G4 — a short board; enough keys to tell the target from its neighbours. */
const RANGE = { midiMin: 60, midiMax: 67 }

function mountDisplay(
  props: Partial<InstanceType<typeof PianoDisplay>['$props']> = {},
  slots: Record<string, string> = {},
) {
  return mount(PianoDisplay, {
    props: { ...RANGE, ...props },
    slots,
    global: { plugins: [createPinia(), i18n] },
  })
}

describe('PianoDisplay - lane slot', () => {
  test('should render nothing extra when no lane slot is given', () => {
    const wrapper = mountDisplay()

    expect(wrapper.find('[data-testid="lane-probe"]').exists()).toBe(false)
  })

  test('should hand the key layout to the lane slot', () => {
    const wrapper = mountDisplay(
      {},
      {
        lane: `<template #lane="{ layout }">
          <div data-testid="lane-probe" :data-midi-min="layout.midiMin" :data-key-count="layout.whites.length + layout.blacks.length" />
        </template>`,
      },
    )
    const probe = wrapper.get('[data-testid="lane-probe"]')

    expect(probe.attributes('data-midi-min')).toBe('60')
    /* C4 D4 E4 F4 G4 + C♯4 D♯4 F♯4 */
    expect(probe.attributes('data-key-count')).toBe('8')
  })
})

describe('PianoDisplay - target key', () => {
  test('should mark no key by default', () => {
    const wrapper = mountDisplay()

    expect(wrapper.findAll('[data-target]')).toHaveLength(0)
  })

  test('should mark only the target key as active', () => {
    const wrapper = mountDisplay({ targetMidi: 63 })

    const marked = wrapper.findAll('[data-target]')
    expect(marked).toHaveLength(1)
    expect(marked[0].attributes('data-testid')).toBe('piano-key-63')
    expect(marked[0].attributes('data-target')).toBe('active')
  })

  test('should mark the target key as correct once it is hit', () => {
    const wrapper = mountDisplay({ targetMidi: 64, isTargetCorrect: true })

    expect(
      wrapper.get('[data-testid="piano-key-64"]').attributes('data-target'),
    ).toBe('correct')
  })
})
