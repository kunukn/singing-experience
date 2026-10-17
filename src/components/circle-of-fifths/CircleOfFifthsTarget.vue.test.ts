import { describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import CircleOfFifthsTarget from './CircleOfFifthsTarget.vue'

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })

function mountTarget(props = {}) {
  return mount(CircleOfFifthsTarget, {
    props: {
      keyLabel: 'D♭',
      solfege: 'SO' as const,
      noteLabel: 'A♭3',
      hopDirection: 'up' as const,
      sungLabel: null,
      sungState: null,
      isCorrect: false,
      showTooLow: false,
      showTooHigh: false,
      ...props,
    },
    global: { plugins: [i18n] },
  })
}

describe('CircleOfFifthsTarget', () => {
  test('should show the target with its hop arrow', () => {
    const wrapper = mountTarget()
    const note = wrapper.get('[data-testid="circle-target-note"]')

    expect(note.text()).toContain('A♭3')
    expect(note.get('[data-testid="circle-target-hop"]').text()).toBe('↑')
  })

  test('should show a dash when no note is heard', () => {
    const wrapper = mountTarget()
    const sung = wrapper.get('[data-testid="circle-target-sung"]')

    expect(sung.text()).toContain('–')
    expect(sung.attributes('data-state')).toBe('none')
  })

  test.each([
    { sungState: 'low', sungLabel: 'G3' },
    { sungState: 'high', sungLabel: 'B3' },
    { sungState: 'correct', sungLabel: 'A♭3' },
  ] as const)(
    'should show the sung note $sungLabel as $sungState',
    ({ sungState, sungLabel }) => {
      const wrapper = mountTarget({ sungState, sungLabel })
      const sung = wrapper.get('[data-testid="circle-target-sung"]')

      expect(sung.text()).toContain(sungLabel)
      expect(sung.attributes('data-state')).toBe(sungState)
    },
  )

  test('should put the too-low hint on the sung line, not the target line', () => {
    const wrapper = mountTarget({
      sungState: 'low',
      sungLabel: 'G3',
      showTooLow: true,
    })
    const sung = wrapper.get('[data-testid="circle-target-sung"]')
    const note = wrapper.get('[data-testid="circle-target-note"]')

    expect(
      sung
        .get('[data-testid="circle-target-too-low"]')
        .attributes('data-visible'),
    ).toBe('true')
    expect(note.find('[data-testid="circle-target-too-low"]').exists()).toBe(
      false,
    )
  })
})
