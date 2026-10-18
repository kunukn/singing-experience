import { describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import PitchGameCompletePanel from './PitchGameCompletePanel.vue'
import type { GameSummary } from './usePitchGame'

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })

function mountPanel(score: number, endReason: GameSummary['endReason']) {
  return mount(PitchGameCompletePanel, {
    props: {
      score,
      totalTargets: 5,
      durationSec: 10,
      elapsedSeconds: '10.0',
      voiceRangeLabel: 'Comfy',
      voiceRangeNoteRange: 'C3–C4',
      endReason,
    },
    global: { plugins: [i18n, PrimeVue] },
  })
}

describe('PitchGameCompletePanel', () => {
  test.each([
    { score: 3, endReason: 'natural', heading: 'Congratulations!' },
    { score: 0, endReason: 'natural', heading: 'Game over' },
    { score: 3, endReason: 'manual', heading: 'Game over' },
  ] as const)(
    'should head a $endReason finish with $score hits "$heading"',
    ({ score, endReason, heading }) => {
      const wrapper = mountPanel(score, endReason)

      expect(wrapper.get('h2').text()).toBe(heading)
    },
  )

  test('should pass Play Again and Settings through', async () => {
    const wrapper = mountPanel(3, 'natural')

    await wrapper.get('[data-testid="game-play-again"]').trigger('click')
    await wrapper.get('[data-testid="game-settings"]').trigger('click')

    expect(wrapper.emitted('playAgain')).toHaveLength(1)
    expect(wrapper.emitted('settings')).toHaveLength(1)
  })
})
