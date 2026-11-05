import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { TONE_CLICK_HIGHLIGHT_DURATION_MS } from '@/constants/toneConstants'
import en from '@/locales/en.json'
import { midiToFrequency } from '@/utils/noteUtils'
import NotesUsedChart from './NotesUsedChart.vue'

const playTone = vi.fn(() => Promise.resolve())

/* Tones need a Web Audio context happy-dom doesn't have. */
vi.mock('@/composables/useTonePlayer', () => ({
  useTonePlayer: () => ({ playTone, setToneMode: vi.fn() }),
}))

const G3 = 55
const D3 = 50

function mountChart() {
  return mount(NotesUsedChart, {
    props: {
      notesUsed: [
        { midi: G3, totalMs: 4000 },
        { midi: D3, totalMs: 2000 },
      ],
      takeKey: null,
    },
    global: {
      plugins: [
        createPinia(),
        createI18n({ legacy: false, locale: 'en', messages: { en } }),
      ],
    },
  })
}

const rowFor = (wrapper: ReturnType<typeof mountChart>, label: string) =>
  wrapper
    .findAll('[data-testid="notes-used-row"]')
    .find((row) => row.get('[data-testid="notes-used-play"]').text() === label)!

beforeEach(() => {
  playTone.mockClear()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('NotesUsedChart - hear a note', () => {
  test('should play the tapped note and pause the take', async () => {
    const wrapper = mountChart()

    await rowFor(wrapper, 'G3')
      .get('[data-testid="notes-used-play"]')
      .trigger('click')

    expect(playTone).toHaveBeenCalledWith(midiToFrequency(G3))
    expect(wrapper.emitted('tonePlay')).toHaveLength(1)
  })

  test('should highlight the sounding note for a moment', async () => {
    const wrapper = mountChart()
    const row = rowFor(wrapper, 'G3')

    await row.get('[data-testid="notes-used-play"]').trigger('click')
    expect(row.attributes('data-playing')).toBe('true')
    expect(rowFor(wrapper, 'D3').attributes('data-playing')).toBe('false')

    vi.advanceTimersByTime(TONE_CLICK_HIGHLIGHT_DURATION_MS)
    await nextTick()
    expect(row.attributes('data-playing')).toBe('false')
  })

  test('should name the action for screen readers', () => {
    const button = rowFor(mountChart(), 'G3').get(
      '[data-testid="notes-used-play"]',
    )

    expect(button.attributes('aria-label')).toBe('Play G3')
  })
})
