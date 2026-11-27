import { beforeEach, describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import { detectScales } from '@/utils/scaleDetection'
import type { TakeKey } from './analyzeTake'
import TakeKeyScale from './TakeKeyScale.vue'
import { familiarTwins } from './takeKeyScale'

const SAME_NOTES = '[data-testid="notes-used-same-notes"]'

/* F G A B♭ C D E♭ F */
const F_MIXOLYDIAN_MIDIS = [65, 67, 69, 70, 72, 74, 75, 77]
/* F G A B♭ C D E F */
const F_MAJOR_MIDIS = [65, 67, 69, 70, 72, 74, 76, 77]
const NOTE_MS = 500

/* The key the take analysis names for a scale sung once, every note the same
 * length. */
function takeKeyFor(midis: number[]): TakeKey {
  const [family] = detectScales(
    midis.map((midi) => ({ midi, durationMs: NOTE_MS })),
  ).families

  return {
    ...family.candidates[0],
    pitchClasses: family.pitchClasses,
    familiarTwins: familiarTwins(family.candidates),
  }
}

function mountScale(midis: number[]) {
  return mount(TakeKeyScale, {
    props: {
      takeKey: takeKeyFor(midis),
      /* Highest note first, as the analysis lists them. */
      notesUsed: midis.toReversed().map((midi) => ({ midi, totalMs: NOTE_MS })),
    },
    global: {
      plugins: [
        createPinia(),
        createI18n({ legacy: false, locale: 'en', messages: { en } }),
      ],
    },
  })
}

beforeEach(() => {
  /* The tone mode store keeps its choice in localStorage. */
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('TakeKeyScale', () => {
  test('should name the major and minor scales with the same notes', () => {
    const wrapper = mountScale(F_MIXOLYDIAN_MIDIS)

    expect(wrapper.get('[data-testid="notes-used-key"]').text()).toContain(
      'F Mixolydian',
    )
    expect(wrapper.get(SAME_NOTES).text()).toContain('Same notes:')
    expect(wrapper.get(SAME_NOTES).text()).toContain('B♭ Major')
    expect(wrapper.get(SAME_NOTES).text()).toContain('G Minor')
  })

  test('should hide the same notes line without familiar twins', () => {
    const wrapper = mountScale(F_MAJOR_MIDIS)

    expect(wrapper.get('[data-testid="notes-used-key"]').text()).toContain(
      'F Major',
    )
    expect(wrapper.find(SAME_NOTES).exists()).toBe(false)
  })
})
