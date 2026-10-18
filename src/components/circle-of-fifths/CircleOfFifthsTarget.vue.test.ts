import { describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import CircleOfFifthsTarget from './CircleOfFifthsTarget.vue'

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })

function mountTarget(props = {}) {
  return mount(CircleOfFifthsTarget, {
    props: {
      keyLabel: 'D♭ major',
      solfege: 'SO' as const,
      noteLabel: 'A♭3',
      hopDirection: 'up' as const,
      sungLabel: null,
      sungState: null,
      isCorrect: false,
      showTooLow: false,
      showTooHigh: false,
      chordNotes: [],
      isChordRinging: false,
      ...props,
    },
    global: { plugins: [i18n] },
  })
}

describe('CircleOfFifthsTarget', () => {
  test('should name the ringing chord and mark the note to sing next', () => {
    const wrapper = mountTarget({
      chordNotes: [
        { label: 'C', isNext: false },
        { label: 'E', isNext: false },
        { label: 'G', isNext: true },
      ],
      isChordRinging: true,
    })
    const chord = wrapper.get('[data-testid="circle-target-chord"]')

    expect(chord.attributes('data-visible')).toBe('true')
    expect(chord.text()).toBe('C·E·G')
    expect(chord.get('[data-next="true"]').text()).toBe('G')
  })

  test('should keep the chord row laid out but hidden once it fades', () => {
    const wrapper = mountTarget({
      chordNotes: [{ label: 'C', isNext: false }],
      isChordRinging: false,
    })
    const chord = wrapper.get('[data-testid="circle-target-chord"]')

    expect(chord.attributes('data-visible')).toBe('false')
    expect(chord.text()).toBe('C')
  })

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
