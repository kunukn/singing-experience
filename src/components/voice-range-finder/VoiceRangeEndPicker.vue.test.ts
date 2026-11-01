import { describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import VoiceRangeEndPicker from './VoiceRangeEndPicker.vue'

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })

const C4 = 60

function mountPicker(end: 'high' | 'low', disabled = false) {
  return mount(VoiceRangeEndPicker, {
    props: { end, disabled, modelValue: C4 },
    global: { plugins: [i18n, PrimeVue] },
  })
}

describe('VoiceRangeEndPicker', () => {
  test.each([
    { end: 'high', label: 'Highest note', id: 'highest' },
    { end: 'low', label: 'Lowest note', id: 'lowest' },
  ] as const)(
    'should label the $end end and name its Sing button',
    ({ end, label, id }) => {
      const wrapper = mountPicker(end)
      const sing = wrapper.get(`[data-testid="my-range-sing-${id}"]`)

      expect(wrapper.text()).toContain(label)
      expect(wrapper.find(`[data-testid="my-range-${id}"]`).exists()).toBe(true)
      expect(sing.attributes('aria-label')).toBe(`Sing: ${label}`)
    },
  )

  test('should emit sing, and disable Sing while a search runs', async () => {
    const wrapper = mountPicker('high')
    await wrapper.get('[data-testid="my-range-sing-highest"]').trigger('click')

    expect(wrapper.emitted('sing')).toHaveLength(1)

    await wrapper.setProps({ disabled: true })

    expect(
      wrapper
        .get('[data-testid="my-range-sing-highest"]')
        .attributes('disabled'),
    ).toBeDefined()
  })
})
