import { describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import { VOICE_RANGES } from '@/constants/voiceRanges'
import VoiceTypeComparison from './VoiceTypeComparison.vue'

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })

/* G♯2–C4 */
function mountComparison(midiMin = 44, midiMax = 60) {
  return mount(VoiceTypeComparison, {
    props: { midiMin, midiMax },
    global: { plugins: [i18n] },
  })
}

const rowsOf = (wrapper: ReturnType<typeof mountComparison>) =>
  wrapper.findAll('[data-testid="voice-type-comparison-row"]')

const rowFor = (
  wrapper: ReturnType<typeof mountComparison>,
  labelKey: string,
) => wrapper.get(`[data-voice-type="${labelKey}"]`)

describe('VoiceTypeComparison', () => {
  test('should list all six voice types, Soprano first', () => {
    const voiceTypes = rowsOf(mountComparison()).map((row) =>
      row.attributes('data-voice-type'),
    )

    expect(voiceTypes).toEqual([
      'voiceRanges.soprano',
      'voiceRanges.mezzoSoprano',
      'voiceRanges.alto',
      'voiceRanges.tenor',
      'voiceRanges.baritone',
      'voiceRanges.bass',
    ])
  })

  test('should show how much of the voice is covered and which way to go', () => {
    const baritone = rowFor(mountComparison(), 'voiceRanges.baritone')

    expect(baritone.attributes('data-coverage')).toBe('63')
    expect(baritone.text()).toContain('63%')
    expect(
      baritone.get('[data-testid="voice-type-comparison-hint"]').text(),
    ).toBe('↑A4')
    expect(baritone.attributes('aria-label')).toBe(
      'Baritone, A2–A4. You cover 63%. Sing up to A4.',
    )
  })

  test('should point both ways when the range sits inside the voice', () => {
    const bass = rowFor(mountComparison(), 'voiceRanges.bass')

    expect(bass.get('[data-testid="voice-type-comparison-hint"]').text()).toBe(
      '↓E2 ↑E4',
    )
  })

  test('should tick a voice that is covered whole', () => {
    const baritone = rowFor(mountComparison(45, 69), 'voiceRanges.baritone')

    expect(
      baritone.get('[data-testid="voice-type-comparison-hint"]').text(),
    ).toBe('✓')
  })

  test('should mark exactly one best fit', () => {
    const bestFits = rowsOf(mountComparison()).filter(
      (row) => row.attributes('data-best-fit') === 'true',
    )

    expect(bestFits.map((row) => row.attributes('data-voice-type'))).toEqual([
      'voiceRanges.bass',
    ])
  })

  test('should ask for the voice range when a row is tapped', async () => {
    const wrapper = mountComparison()

    await rowFor(wrapper, 'voiceRanges.baritone').trigger('click')

    expect(wrapper.emitted('selectRange')).toEqual([
      [
        VOICE_RANGES.findIndex(
          (range) => range.labelKey === 'voiceRanges.baritone',
        ),
      ],
    ])
  })
})
