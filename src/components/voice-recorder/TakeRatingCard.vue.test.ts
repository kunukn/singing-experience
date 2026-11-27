import { describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import { MIN_RATED_VOICED_MS } from './takeRating'
import TakeRatingCard from './TakeRatingCard.vue'

const MESSAGE = '[data-testid="take-rating-too-short"]'
const MIN_SECONDS = MIN_RATED_VOICED_MS / 1000

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
    /* 2.1 s short of the minimum, which rounds down to 3 whole seconds short. */
    const message = mountCard(MIN_RATED_VOICED_MS - 2_100).get(MESSAGE)

    expect(message.attributes('data-reason')).toBe('singing-time')
    expect(message.text()).toBe(
      `Clear singing heard: ${MIN_SECONDS - 3} of ${MIN_SECONDS} seconds. Sing a bit longer to get a rating. Pauses and breaths don't count.`,
    )
  })

  test('should round down, never showing the full time for a short take', () => {
    expect(
      mountCard(MIN_RATED_VOICED_MS - 1)
        .get(MESSAGE)
        .text(),
    ).toContain(`${MIN_SECONDS - 1} of ${MIN_SECONDS} seconds`)
  })

  test('should ask for more notes when there was singing time enough', () => {
    const message = mountCard(MIN_RATED_VOICED_MS + 2_000).get(MESSAGE)

    expect(message.attributes('data-reason')).toBe('notes')
    expect(message.text()).toBe(
      `Sing a few different notes for at least ${MIN_SECONDS} seconds to get a rating.`,
    )
  })
})
