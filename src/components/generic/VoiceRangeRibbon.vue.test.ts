import { describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import { VOICE_RANGES } from '@/constants/voiceRanges'
import VoiceRangeRibbon from './VoiceRangeRibbon.vue'

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })

function indexOfRange(labelKey: string): number {
  return VOICE_RANGES.findIndex((range) => range.labelKey === labelKey)
}

function mountRibbon(labelKey: string, containerHeight = 600) {
  const rangeIndex = indexOfRange(labelKey)
  const range = VOICE_RANGES[rangeIndex]

  return mount(VoiceRangeRibbon, {
    props: {
      midiMin: range.midiMin,
      midiMax: range.midiMax,
      rangeIndex,
      containerHeight,
      insetStart: 40,
    },
    global: { plugins: [i18n] },
  })
}

describe('VoiceRangeRibbon', () => {
  test('should render one segment per voice type inside a wide range', () => {
    const wrapper = mountRibbon('voiceRanges.choir')

    expect(wrapper.findAll('[data-testid="voice-range-segment"]')).toHaveLength(
      6,
    )
  })

  test('should render every overlapping voice for a single-voice range', () => {
    /* Mezzo-Soprano A3–A5 overlaps all six, most of them clipped */
    const wrapper = mountRibbon('voiceRanges.mezzoSoprano')

    expect(wrapper.findAll('[data-testid="voice-range-segment"]')).toHaveLength(
      6,
    )
    expect(
      wrapper
        .get('[data-voice-type="voiceRanges.bass"]')
        .attributes('data-clipped-low'),
    ).toBe('true')
  })

  test('should mark the segment matching the selected voice type', () => {
    const wrapper = mountRibbon('voiceRanges.mezzoSoprano')

    expect(
      wrapper
        .get('[data-voice-type="voiceRanges.mezzoSoprano"]')
        .attributes('data-selected'),
    ).toBe('true')
    expect(
      wrapper
        .get('[data-voice-type="voiceRanges.tenor"]')
        .attributes('data-selected'),
    ).toBe('false')
  })

  test('should mark no segment when the range spans several voices', () => {
    const wrapper = mountRibbon('voiceRanges.choir')
    const selected = wrapper
      .findAll('[data-testid="voice-range-segment"]')
      .filter((segment) => segment.attributes('data-selected') === 'true')

    expect(selected).toHaveLength(0)
  })

  test('should render nothing before the container has been measured', () => {
    const wrapper = mountRibbon('voiceRanges.choir', 0)

    expect(wrapper.find('[data-testid="voice-range-ribbon"]').exists()).toBe(
      false,
    )
  })

  test('should label a segment with its voice name and real note span', () => {
    const wrapper = mountRibbon('voiceRanges.choir')
    const tenor = wrapper.get('[data-voice-type="voiceRanges.tenor"]')

    expect(tenor.attributes('aria-label')).toBe('Tenor, C3–C5')
  })

  test('should flag the end where a voice runs past the visible range', () => {
    /* bassToBaritone is C2–C4, so Tenor's C5 ceiling falls outside it */
    const wrapper = mountRibbon('voiceRanges.bassToBaritone')
    const tenor = wrapper.get('[data-voice-type="voiceRanges.tenor"]')

    expect(tenor.attributes('data-clipped-low')).toBe('false')
    expect(tenor.attributes('data-clipped-high')).toBe('true')
  })

  test('should emit the voice type range index when a segment is clicked', async () => {
    const wrapper = mountRibbon('voiceRanges.choir')

    await wrapper.get('[data-voice-type="voiceRanges.tenor"]').trigger('click')

    expect(wrapper.emitted('selectRange')).toEqual([
      [indexOfRange('voiceRanges.tenor')],
    ])
  })

  test('should place a higher voice above a lower one', () => {
    const wrapper = mountRibbon('voiceRanges.choir')
    const topOf = (labelKey: string) =>
      Number.parseFloat(
        wrapper
          .get(`[data-voice-type="${labelKey}"]`)
          .attributes('style')!
          .match(/top:\s*([\d.]+)px/)![1],
      )

    expect(topOf('voiceRanges.soprano')).toBeLessThan(topOf('voiceRanges.bass'))
  })
})
