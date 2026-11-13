import { describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import VoiceRangeSearchStep from './VoiceRangeSearchStep.vue'

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })

const CUE = '[data-testid="voice-range-finder-pause-cue"]'
const HEADING = '[data-testid="voice-range-finder-step-heading"]'
const FINISH = '[data-testid="voice-range-finder-done"]'

type Props = InstanceType<typeof VoiceRangeSearchStep>['$props']

const mountStep = (props: Partial<Props>) =>
  mount(VoiceRangeSearchStep, {
    props: {
      step: 'low',
      mode: 'both',
      sungMidi: null,
      candidateMidi: null,
      progress: 0,
      isFilling: false,
      pauseReason: null,
      lowestMidi: null,
      highestMidi: null,
      ...props,
    },
    global: { plugins: [i18n, PrimeVue] },
  })

describe('VoiceRangeSearchStep', () => {
  describe('above the top limit', () => {
    const mountAbove = () =>
      mountStep({
        step: 'high',
        sungMidi: 86, // D6
        pauseReason: 'aboveLimit',
      })

    test('should say how high the notes count', () => {
      const wrapper = mountAbove()

      expect(
        wrapper.get('[data-testid="voice-range-finder-hold-hint"]').text(),
      ).toBe('We only count notes up to C6.')
      wrapper.unmount()
    })

    test('should not point anywhere with an arrow', () => {
      const wrapper = mountAbove()

      expect(wrapper.find(CUE).exists()).toBe(false)
      wrapper.unmount()
    })
  })

  describe('sound with no clear pitch', () => {
    const mountUnclear = () => mountStep({ pauseReason: 'unclear' })

    test('should say no clear note is heard', () => {
      const wrapper = mountUnclear()

      expect(
        wrapper.get('[data-testid="voice-range-finder-hold-hint"]').text(),
      ).toBe("Can't hear a clear note.")
      wrapper.unmount()
    })

    test('should not point anywhere with an arrow', () => {
      const wrapper = mountUnclear()

      expect(wrapper.find(CUE).exists()).toBe(false)
      wrapper.unmount()
    })
  })

  describe('pause cue', () => {
    test('should point down to the next note below the low record', () => {
      const wrapper = mountStep({
        sungMidi: 46, // A♯2
        lowestMidi: 44, // G♯2
        pauseReason: 'notPastRecord',
      })

      expect(wrapper.get(CUE).text().replace(/\s/g, '')).toBe('↓G2')
      wrapper.unmount()
    })

    test('should point up to the next note above the high record', () => {
      const wrapper = mountStep({
        step: 'high',
        sungMidi: 69, // A4
        highestMidi: 72, // C5
        pauseReason: 'notPastRecord',
      })

      expect(wrapper.get(CUE).text().replace(/\s/g, '')).toBe('↑C♯5')
      wrapper.unmount()
    })

    test.each([
      { direction: 'sharp', sungMidi: 72.3, arrow: '↓' },
      { direction: 'flat', sungMidi: 71.7, arrow: '↑' },
    ])(
      'should show only an arrow back to the centre when $direction',
      ({ sungMidi, arrow }) => {
        const wrapper = mountStep({
          step: 'high',
          sungMidi,
          pauseReason: 'offPitch',
        })

        expect(wrapper.get(CUE).text()).toBe(arrow)
        wrapper.unmount()
      },
    )

    test('should show no cue while the bar fills', () => {
      const wrapper = mountStep({
        sungMidi: 43,
        candidateMidi: 43,
        progress: 0.5,
        isFilling: true,
      })

      expect(wrapper.find(CUE).exists()).toBe(false)
      wrapper.unmount()
    })

    test('should show no cue during the record flash', async () => {
      const wrapper = mountStep({
        sungMidi: 43,
        lowestMidi: 44,
        pauseReason: 'notPastRecord',
      })
      expect(wrapper.find(CUE).exists()).toBe(true)

      await wrapper.setProps({ lowestMidi: 43 })

      expect(
        wrapper
          .get('[data-testid="voice-range-finder-step"]')
          .attributes('data-record-flash'),
      ).toBe('true')
      expect(wrapper.find(CUE).exists()).toBe(false)
      wrapper.unmount()
    })
  })

  describe('step heading', () => {
    test.each([
      { step: 'low', expected: '1 of 2 · Lowest note' },
      { step: 'high', expected: '2 of 2 · Highest note' },
    ] as const)(
      'should count the $step step of a full search',
      ({ step, expected }) => {
        const wrapper = mountStep({ step, mode: 'both' })

        expect(wrapper.get(HEADING).text()).toBe(expected)
        wrapper.unmount()
      },
    )

    test('should not count steps in a one-end search', () => {
      const wrapper = mountStep({ step: 'high', mode: 'high' })

      expect(wrapper.get(HEADING).text()).toBe('Highest note')
      wrapper.unmount()
    })
  })

  describe('finish button', () => {
    test.each([
      {
        name: 'the low step of a full search with nothing sung',
        props: { step: 'low', mode: 'both' },
        expected: 'Skip',
      },
      {
        name: 'the low step of a full search with a note saved',
        props: { step: 'low', mode: 'both', lowestMidi: 43 },
        expected: 'Next',
      },
      {
        name: 'the high step of a full search',
        props: { step: 'high', mode: 'both', lowestMidi: 43 },
        expected: 'Done',
      },
      {
        name: 'a one-end search',
        props: { step: 'low', mode: 'low', lowestMidi: 43 },
        expected: 'Done',
      },
    ] as const)('should say $expected on $name', ({ props, expected }) => {
      const wrapper = mountStep(props)

      expect(wrapper.get(FINISH).text()).toBe(expected)
      wrapper.unmount()
    })
  })

  test('should emit cancel from the close button', async () => {
    const wrapper = mountStep({})

    await wrapper
      .get('[data-testid="voice-range-finder-cancel"]')
      .trigger('click')

    expect(wrapper.emitted('cancel')).toHaveLength(1)
    wrapper.unmount()
  })
})
