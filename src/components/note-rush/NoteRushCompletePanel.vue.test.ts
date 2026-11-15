import { describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import NoteRushCompletePanel from './NoteRushCompletePanel.vue'
import type { GameSummary } from './useNoteRush'

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })

function mountPanel(score: number, endReason: GameSummary['endReason']) {
  return mount(NoteRushCompletePanel, {
    props: {
      score,
      totalTargets: 5,
      durationSec: 10,
      difficulty: 'hard',
      elapsedSeconds: '10.0',
      voiceRangeLabel: 'Comfy',
      voiceRangeNoteRange: 'C3–C4',
      endReason,
    },
    global: { plugins: [i18n, PrimeVue] },
  })
}

describe('NoteRushCompletePanel', () => {
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

  test.each([
    { score: 5, stars: '3' },
    { score: 3, stars: '2' },
    { score: 1, stars: '1' },
  ])('should award $stars stars for $score of 5', ({ score, stars }) => {
    const wrapper = mountPanel(score, 'natural')

    expect(
      wrapper.get('[data-testid="note-rush-stars"]').attributes('data-stars'),
    ).toBe(stars)
  })

  test('should award no stars when the round was stopped', () => {
    const wrapper = mountPanel(5, 'manual')

    expect(wrapper.find('[data-testid="note-rush-stars"]').exists()).toBe(false)
  })

  test('should name the level the round was played on', () => {
    const wrapper = mountPanel(3, 'natural')

    expect(wrapper.get('[data-testid="note-rush-difficulty"]').text()).toBe(
      'Hard',
    )
  })

  test('should pass Play Again and Settings through', async () => {
    const wrapper = mountPanel(3, 'natural')

    await wrapper.get('[data-testid="game-play-again"]').trigger('click')
    await wrapper.get('[data-testid="game-settings"]').trigger('click')

    expect(wrapper.emitted('playAgain')).toHaveLength(1)
    expect(wrapper.emitted('settings')).toHaveLength(1)
  })
})
