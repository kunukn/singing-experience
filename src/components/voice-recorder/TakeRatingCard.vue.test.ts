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
    const message = mountCard(12_900).get(MESSAGE)

    expect(message.attributes('data-reason')).toBe('singing-time')
    expect(message.text()).toBe(
      "Clear singing heard: 12 of 15 seconds. Sing a bit longer to get a rating. Pauses and breaths don't count.",
    )
  })

  test('should round down, never showing the full time for a short take', () => {
    expect(mountCard(14_999).get(MESSAGE).text()).toContain('14 of 15 seconds')
  })

  test('should ask for more notes when there was singing time enough', () => {
    const message = mountCard(17_000).get(MESSAGE)

    expect(message.attributes('data-reason')).toBe('notes')
    expect(message.text()).toBe(
      'Sing a few different notes for at least 15 seconds to get a rating.',
    )
  })
})
