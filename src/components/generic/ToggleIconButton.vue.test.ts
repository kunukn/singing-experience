import { afterEach, describe, expect, test, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'
import ToggleIconButton from './ToggleIconButton.vue'
import type { ToggleLabelFrom } from './toggleIconButton'

const LABEL = 'See my voice'

/* A screen this wide: every (min-width: Npx) query matches when N ≤ width */
function setScreenWidth(width: number) {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query) =>
      ({
        matches: Number(query.match(/min-width:\s*([\d.]+)px/)?.[1]) <= width,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  )
}

function mountToggle(labelFrom?: ToggleLabelFrom) {
  return mount(ToggleIconButton, {
    props: {
      modelValue: false,
      iconOn: 'pi pi-microphone',
      iconOff: 'pi pi-microphone',
      label: LABEL,
      labelFrom,
    },
    global: { plugins: [PrimeVue] },
  })
}

describe('ToggleIconButton', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  test.each([
    { labelFrom: undefined, width: 767, isShown: false },
    { labelFrom: undefined, width: 768, isShown: true },
    { labelFrom: 'sm', width: 639, isShown: false },
    { labelFrom: 'sm', width: 640, isShown: true },
    { labelFrom: 'lg', width: 1023, isShown: false },
    { labelFrom: 'lg', width: 1024, isShown: true },
    { labelFrom: 'always', width: 320, isShown: true },
    { labelFrom: 'never', width: 1920, isShown: false },
  ] as const)(
    'should show the text with labelFrom $labelFrom at $width px: $isShown',
    ({ labelFrom, width, isShown }) => {
      setScreenWidth(width)
      const button = mountToggle(labelFrom).get('button')

      expect(button.text().includes(LABEL)).toBe(isShown)
      expect(button.attributes('aria-label')).toBe(LABEL)
    },
  )

  test('should flip its value when clicked', async () => {
    const wrapper = mountToggle()

    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([[true]])
  })
})
