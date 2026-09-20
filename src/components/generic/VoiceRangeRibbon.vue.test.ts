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

  test('should render the neighbouring voices for a single-voice range', () => {
    /* Mezzo-Soprano A3–A5 keeps the four voices that reach meaningfully into
     * it; Bass and Baritone barely do and are filtered out. */
    const wrapper = mountRibbon('voiceRanges.mezzoSoprano')

    expect(wrapper.findAll('[data-testid="voice-range-segment"]')).toHaveLength(
      4,
    )
    expect(
      wrapper
        .get('[data-voice-type="voiceRanges.tenor"]')
        .attributes('data-clipped-low'),
    ).toBe('true')
    expect(wrapper.find('[data-voice-type="voiceRanges.bass"]').exists()).toBe(
      false,
    )
  })

  function voiceTypesOf(labelKey: string) {
    return mountRibbon(labelKey)
      .findAll('[data-testid="voice-range-segment"]')
      .map((segment) => segment.attributes('data-voice-type'))
  }

  test('should show only the voices a focused range names', () => {
    /* E2–A4 reaches well into Tenor and Alto, and C3–C6 contains every voice
     * outright, but both ranges are named after a pair and say only that. */
    expect(voiceTypesOf('voiceRanges.bassToBaritone')).toEqual([
      'voiceRanges.bass',
      'voiceRanges.baritone',
    ])
    expect(voiceTypesOf('voiceRanges.tenorToSoprano')).toEqual([
      'voiceRanges.tenor',
      'voiceRanges.soprano',
    ])
  })

  test('should fall back to coverage for a range that names no voices', () => {
    expect(voiceTypesOf('voiceRanges.lowVoices')).toEqual([
      'voiceRanges.bass',
      'voiceRanges.baritone',
    ])
    expect(voiceTypesOf('voiceRanges.highVoices')).toEqual([
      'voiceRanges.alto',
      'voiceRanges.mezzoSoprano',
      'voiceRanges.soprano',
    ])
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
    /* lowVoices is C2–C4, so Baritone's A4 ceiling falls outside it */
    const wrapper = mountRibbon('voiceRanges.lowVoices')
    const baritone = wrapper.get('[data-voice-type="voiceRanges.baritone"]')

    expect(baritone.attributes('data-clipped-low')).toBe('false')
    expect(baritone.attributes('data-clipped-high')).toBe('true')
  })

  test('should present segments as images rather than controls', () => {
    /* A 5px lane can never be a 24px target, so picking a voice belongs to the
     * range select and the legend — see VoiceRangeLegend. */
    const wrapper = mountRibbon('voiceRanges.choir')

    expect(wrapper.findAll('button')).toHaveLength(0)
    expect(
      wrapper.get('[data-voice-type="voiceRanges.tenor"]').attributes('role'),
    ).toBe('img')
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
