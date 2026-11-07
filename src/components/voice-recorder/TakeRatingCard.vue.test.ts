import { describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import TakeRatingCard from './TakeRatingCard.vue'

const MESSAGE = '[data-testid="take-rating-too-short"]'

function mountCard(voicedMs: number) {
  return mount(TakeRatingCard, {
    props: { rating: null, voicedMs },
    global: {
      plugins: [createI18n({ legacy: false, locale: 'en', messages: { en } })],
    },
  })
}

describe('TakeRatingCard - no rating yet', () => {
  test('should say how much clear singing was heard when that is short', () => {
    const message = mountCard(7_900).get(MESSAGE)

    expect(message.attributes('data-reason')).toBe('singing-time')
    expect(message.text()).toBe(
      "Clear singing heard: 7 of 10 seconds. Sing a bit longer to get a rating. Pauses and breaths don't count.",
    )
  })

  test('should round down, never showing the full time for a short take', () => {
    expect(mountCard(9_999).get(MESSAGE).text()).toContain('9 of 10 seconds')
  })

  test('should ask for more notes when there was singing time enough', () => {
    const message = mountCard(12_000).get(MESSAGE)

    expect(message.attributes('data-reason')).toBe('notes')
    expect(message.text()).toBe(
      'Sing a few different notes for at least 10 seconds to get a rating.',
    )
  })
})
