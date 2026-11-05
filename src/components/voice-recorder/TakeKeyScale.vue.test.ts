import { describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import type { ScaleCandidate } from '@/utils/scaleDetection'
import type { TakeKey } from './analyzeTake'
import TakeKeyScale from './TakeKeyScale.vue'

const SAME_NOTES = '[data-testid="notes-used-same-notes"]'

const F = 5
const G = 7
const B_FLAT = 10

function mountScale(takeKey: Omit<TakeKey, 'pitchClasses' | 'tonicScore'>) {
  return mount(TakeKeyScale, {
    props: {
      takeKey: { ...takeKey, pitchClasses: new Set<number>(), tonicScore: 0 },
      notesUsed: [{ midi: 53, totalMs: 500 }],
    },
    global: {
      plugins: [
        createPinia(),
        createI18n({ legacy: false, locale: 'en', messages: { en } }),
      ],
    },
  })
}

describe('TakeKeyScale', () => {
  test('should name the major and minor scales with the same notes', () => {
    const familiarTwins: ScaleCandidate[] = [
      { root: B_FLAT, mode: 'ionian', tonicScore: 0 },
      { root: G, mode: 'aeolian', tonicScore: 0 },
    ]
    const wrapper = mountScale({ root: F, mode: 'mixolydian', familiarTwins })

    expect(wrapper.get('[data-testid="notes-used-key"]').text()).toContain(
      'F Mixolydian',
    )
    expect(wrapper.get(SAME_NOTES).text()).toContain('Same notes:')
    expect(wrapper.get(SAME_NOTES).text()).toContain('B♭ Major')
    expect(wrapper.get(SAME_NOTES).text()).toContain('G Minor')
  })

  test('should hide the same notes line without familiar twins', () => {
    const wrapper = mountScale({ root: F, mode: 'ionian', familiarTwins: [] })

    expect(wrapper.find(SAME_NOTES).exists()).toBe(false)
  })
})
