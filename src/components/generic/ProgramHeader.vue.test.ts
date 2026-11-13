import { describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import ProgramHeader from './ProgramHeader.vue'

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })

function mountHeader(props: Record<string, unknown> = {}) {
  return mount(ProgramHeader, {
    props: { programKey: 'noteRush', ...props },
    global: { plugins: [i18n] },
  })
}

describe('ProgramHeader', () => {
  test('should show the name from the program card as the heading', () => {
    expect(mountHeader().get('h1').text()).toBe('Note Rush')
  })

  test('should append the title suffix', () => {
    const wrapper = mountHeader({ titleSuffix: 'Test' })

    expect(wrapper.get('h1').text()).toBe('Note Rush Test')
  })

  test('should render no subtitle when none is given', () => {
    const wrapper = mountHeader()

    expect(wrapper.find('[data-testid="program-subtitle"]').exists()).toBe(
      false,
    )
  })

  test('should show the subtitle', () => {
    const subtitle = mountHeader({ subtitle: 'Sing each note' }).get(
      '[data-testid="program-subtitle"]',
    )

    expect(subtitle.text()).toBe('Sing each note')
    expect(subtitle.attributes('data-hidden')).toBe('false')
  })

  test('should keep a hidden subtitle in the layout', () => {
    const subtitle = mountHeader({
      subtitle: 'Sing each note',
      isSubtitleHidden: true,
    }).get('[data-testid="program-subtitle"]')

    expect(subtitle.attributes('data-hidden')).toBe('true')
  })
})
