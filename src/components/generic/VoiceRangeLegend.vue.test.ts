import { describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import { VOICE_RANGES } from '@/constants/voiceRanges'
import VoiceRangeLegend from './VoiceRangeLegend.vue'
import VoiceRangeRibbon from './VoiceRangeRibbon.vue'

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })

function indexOfRange(labelKey: string): number {
  return VOICE_RANGES.findIndex((range) => range.labelKey === labelKey)
}

function mountLegend(labelKey: string) {
  const rangeIndex = indexOfRange(labelKey)
  const range = VOICE_RANGES[rangeIndex]

  return mount(VoiceRangeLegend, {
    props: {
      midiMin: range.midiMin,
      midiMax: range.midiMax,
      rangeIndex,
    },
    global: { plugins: [i18n] },
  })
}

function voiceTypesOf(labelKey: string) {
  return mountLegend(labelKey)
    .findAll('[data-testid="voice-range-legend-row"]')
    .map((row) => row.attributes('data-voice-type'))
}

describe('VoiceRangeLegend', () => {
  test('should render one row per voice type inside a wide range', () => {
    expect(voiceTypesOf('voiceRanges.choir')).toHaveLength(6)
  })

  test('should order rows high to low, the reverse of the ribbon columns', () => {
    expect(voiceTypesOf('voiceRanges.tenorToSoprano')).toEqual([
      'voiceRanges.soprano',
      'voiceRanges.tenor',
    ])
    expect(voiceTypesOf('voiceRanges.choir')).toEqual([
      'voiceRanges.soprano',
      'voiceRanges.mezzoSoprano',
      'voiceRanges.alto',
      'voiceRanges.tenor',
      'voiceRanges.baritone',
      'voiceRanges.bass',
    ])
  })

  test('should list the voice name and its real note span', () => {
    const wrapper = mountLegend('voiceRanges.tenorToSoprano')
    const row = wrapper.get('[data-voice-type="voiceRanges.soprano"]')

    expect(row.text()).toContain('Soprano')
    expect(row.text()).toContain('C4–C6')
    expect(row.attributes('aria-label')).toBe('Soprano, C4–C6')
  })

  test('should show how much of the range each voice covers', () => {
    /* Comfy – Women C4–C5 is the narrow case: four voices span the whole
     * window, while Baritone stops at A4 and sits on the 75% minimum. */
    const wrapper = mountLegend('voiceRanges.comfyWomen')
    const textOf = (labelKey: string) =>
      wrapper.get(`[data-voice-type="${labelKey}"]`).text()

    expect(textOf('voiceRanges.soprano')).toContain('100%')
    expect(textOf('voiceRanges.baritone')).toContain('75%')
    expect(
      wrapper
        .get('[data-voice-type="voiceRanges.baritone"]')
        .attributes('aria-label'),
    ).toBe('Baritone, C4–A4, 75%')
  })

  test('should omit coverage for a range that names its own voices', () => {
    /* Nothing measured Tenor and Soprano here — the range named them. */
    const wrapper = mountLegend('voiceRanges.tenorToSoprano')
    const rows = wrapper.findAll('[data-testid="voice-range-legend-row"]')

    expect(rows.every((row) => !row.text().includes('%'))).toBe(true)
  })

  test('should mark the row matching the selected voice type', () => {
    const wrapper = mountLegend('voiceRanges.mezzoSoprano')

    expect(
      wrapper
        .get('[data-voice-type="voiceRanges.mezzoSoprano"]')
        .attributes('data-selected'),
    ).toBe('true')
    expect(
      wrapper
        .get('[data-voice-type="voiceRanges.alto"]')
        .attributes('data-selected'),
    ).toBe('false')
  })

  test('should emit the voice type range index when a row is clicked', async () => {
    const wrapper = mountLegend('voiceRanges.tenorToSoprano')

    await wrapper.get('[data-voice-type="voiceRanges.tenor"]').trigger('click')

    expect(wrapper.emitted('selectRange')).toEqual([
      [indexOfRange('voiceRanges.tenor')],
    ])
  })

  test('should list the same voices as the ribbon it names', () => {
    /* The point of the shared composable: a key row and the bar it belongs to
     * can never describe different voices. */
    const rangeIndex = indexOfRange('voiceRanges.choir')
    const range = VOICE_RANGES[rangeIndex]
    const ribbon = mount(VoiceRangeRibbon, {
      props: {
        midiMin: range.midiMin,
        midiMax: range.midiMax,
        rangeIndex,
        containerHeight: 600,
        insetStart: 40,
      },
      global: { plugins: [i18n] },
    })

    const barVoices = ribbon
      .findAll('[data-testid="voice-range-segment"]')
      .map((segment) => segment.attributes('data-voice-type'))

    expect(voiceTypesOf('voiceRanges.choir')).toEqual(barVoices.toReversed())
  })

  test('should mark a clipped end so a row never claims a boundary it lacks', () => {
    /* Low voices C2–C4 cuts Bass off at its top. */
    const wrapper = mountLegend('voiceRanges.lowVoices')
    const row = wrapper.get('[data-voice-type="voiceRanges.bass"]')

    expect(row.attributes('data-clipped-high')).toBe('true')
    expect(row.attributes('data-clipped-low')).toBe('false')
  })

  test('should render nothing when no voice type is on screen', () => {
    const wrapper = mount(VoiceRangeLegend, {
      /* A zero-width span: every voice overlaps it at a single note, which
       * getVoiceTypeSegments drops. */
      props: { midiMin: 60, midiMax: 60, rangeIndex: 0 },
      global: { plugins: [i18n] },
    })

    expect(wrapper.find('[data-testid="voice-range-legend"]').exists()).toBe(
      false,
    )
  })
})
