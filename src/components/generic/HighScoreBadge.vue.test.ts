import { describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import type { HighScore, RecordResult } from '@/stores/useHighScoreStore'
import HighScoreBadge from './HighScoreBadge.vue'

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })

const createScore = (overrides?: Partial<HighScore>): HighScore => ({
  game: 'singTheKeys',
  config: { songId: 'twinkle', speed: 1 },
  correct: 10,
  total: 14,
  elapsedMs: null,
  achievedAt: 0,
  ...overrides,
})

function mountBadge(result: RecordResult | null) {
  return mount(HighScoreBadge, {
    props: { result },
    global: { plugins: [i18n] },
  })
}

describe('HighScoreBadge', () => {
  test('should render nothing without a best score', () => {
    const wrapper = mountBadge({
      isNewRecord: false,
      previous: undefined,
      best: undefined,
    })

    expect(wrapper.find('[data-testid="high-score-badge"]').exists()).toBe(
      false,
    )
  })

  test('should show the best to beat when the run was not a record', () => {
    const best = createScore()
    const wrapper = mountBadge({ isNewRecord: false, previous: best, best })

    const badge = wrapper.get('[data-testid="high-score-badge"]')
    expect(badge.attributes('data-new-record')).toBe('false')
    expect(wrapper.get('[data-testid="best"]').text()).toBe('10/14')
    expect(wrapper.text()).not.toContain('New best!')
  })

  test('should show old and new score on a new record', () => {
    const wrapper = mountBadge({
      isNewRecord: true,
      previous: createScore(),
      best: createScore({ correct: 12 }),
    })

    const badge = wrapper.get('[data-testid="high-score-badge"]')
    expect(badge.attributes('data-new-record')).toBe('true')
    expect(wrapper.text()).toContain('New best!')
    expect(wrapper.get('[data-testid="previous-best"]').text()).toBe('10/14')
    expect(wrapper.get('[data-testid="best"]').text()).toBe('12/14')
  })
})
