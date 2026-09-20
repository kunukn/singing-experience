import { describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import { VOICE_RANGES } from '@/constants/voiceRanges'
import { buildPianoLayout } from './pianoLayout'
import PianoVoiceRangeRibbon from './PianoVoiceRangeRibbon.vue'

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })

function indexOfRange(labelKey: string): number {
  return VOICE_RANGES.findIndex((range) => range.labelKey === labelKey)
}

function mountRibbon(labelKey: string) {
  const rangeIndex = indexOfRange(labelKey)
  const range = VOICE_RANGES[rangeIndex]

  return mount(PianoVoiceRangeRibbon, {
    props: {
      layout: buildPianoLayout(range.midiMin, range.midiMax),
      rangeIndex,
    },
    global: { plugins: [i18n] },
  })
}

function rowsOf(wrapper: ReturnType<typeof mountRibbon>) {
  return wrapper.findAll('[data-testid="piano-voice-range-row"]')
}

/* The bar's start on the keyboard's pitch axis, parsed back out of the inline
 * style the component positions it with. */
function startXOf(wrapper: ReturnType<typeof mountRibbon>, labelKey: string) {
  const style = wrapper
    .get(`[data-voice-type="${labelKey}"]`)
    .attributes('style')

  return Number(/inset-inline-start:\s*([\d.]+)px/.exec(style ?? '')?.[1])
}

describe('PianoVoiceRangeRibbon', () => {
  test('should render one row per voice type inside a wide range', () => {
    expect(rowsOf(mountRibbon('voiceRanges.choir'))).toHaveLength(6)
  })

  test('should render only the voices a range names for itself', () => {
    /* Bass–Baritone names its two voices, so nothing else earns a row however
     * far into the span it reaches. */
    const order = rowsOf(mountRibbon('voiceRanges.bassToBaritone')).map((row) =>
      row.attributes('data-voice-type'),
    )

    expect(order).toEqual(['voiceRanges.baritone', 'voiceRanges.bass'])
  })

  test('should order rows high to low, Soprano on top', () => {
    const order = rowsOf(mountRibbon('voiceRanges.choir')).map((row) =>
      row.attributes('data-voice-type'),
    )

    expect(order[0]).toBe('voiceRanges.soprano')
    expect(order.at(-1)).toBe('voiceRanges.bass')
  })

  test('should place a lower voice further along the keyboard than a higher one', () => {
    const wrapper = mountRibbon('voiceRanges.choir')

    /* The keyboard runs low to high left to right, so Bass starts before
     * Soprano however the rows are stacked. */
    expect(startXOf(wrapper, 'voiceRanges.bass')).toBeLessThan(
      startXOf(wrapper, 'voiceRanges.soprano'),
    )
  })

  test('should mark the ends a voice runs past as clipped', () => {
    const wrapper = mountRibbon('voiceRanges.mezzoSoprano')
    const alto = wrapper.get('[data-voice-type="voiceRanges.alto"]')

    expect(alto.attributes('data-clipped-low')).toBe('true')
    expect(alto.attributes('data-clipped-high')).toBe('false')
  })

  test('should mark the selected voice type', () => {
    const wrapper = mountRibbon('voiceRanges.tenor')

    expect(
      wrapper
        .get('[data-voice-type="voiceRanges.tenor"]')
        .attributes('data-selected'),
    ).toBe('true')
  })

  test('should name a row with its voice, span and coverage', () => {
    const wrapper = mountRibbon('voiceRanges.tenor')

    expect(
      wrapper
        .get('[data-voice-type="voiceRanges.tenor"]')
        .attributes('aria-label'),
    ).toBe('Tenor, C3–C5')
    expect(
      wrapper
        .get('[data-voice-type="voiceRanges.baritone"]')
        .attributes('aria-label'),
    ).toBe('Baritone, C3–A4, 88%')
  })

  test('should print the voice name and note span on each row', () => {
    const soprano = mountRibbon('voiceRanges.choir').get(
      '[data-voice-type="voiceRanges.soprano"]',
    )

    expect(soprano.text()).toContain('Soprano')
    expect(soprano.text()).toContain('C4–C6')
  })

  test('should drop the coverage figure when every voice fits the range whole', () => {
    /* Choir (E2–C6) holds all six voices at 100%, a column of figures that
     * would tell the singer nothing — same rule as the legend's. */
    const soprano = mountRibbon('voiceRanges.choir').get(
      '[data-voice-type="voiceRanges.soprano"]',
    )

    expect(soprano.text()).not.toContain('%')
  })

  test('should print the coverage figure for a voice short of the range', () => {
    /* Baritone A2–A4 keeps 21 of its 24 semitones inside Tenor C3–C5. */
    const baritone = mountRibbon('voiceRanges.tenor').get(
      '[data-voice-type="voiceRanges.baritone"]',
    )

    expect(baritone.text()).toContain('88%')
  })

  test('should print no coverage figure for a range that names its voices', () => {
    /* Nothing measured them, so there is no figure to report. */
    const bass = mountRibbon('voiceRanges.bassToBaritone').get(
      '[data-voice-type="voiceRanges.bass"]',
    )

    expect(bass.text()).not.toContain('%')
  })

  test('should stay reference material rather than a control', () => {
    const wrapper = mountRibbon('voiceRanges.choir')

    expect(wrapper.findAll('button')).toHaveLength(0)
    expect(rowsOf(wrapper)[0].attributes('role')).toBe('img')
  })
})
