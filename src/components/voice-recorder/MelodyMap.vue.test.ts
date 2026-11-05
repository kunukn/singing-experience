import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import { midiToNoteLabel } from '@/utils/noteUtils'
import type { TakeAnalysis } from './analyzeTake'
import MelodyMap from './MelodyMap.vue'
import type { TakeNote } from './takeNotes'

const TOOLTIP = '[data-testid="melody-map-tooltip"]'
const SCROLLER = '[role="img"]'
const G_SHARP_3 = 56
const C_4 = 60

/*
 * happy-dom lays nothing out, so the viewport is 0 px wide and the map is
 * 60 px a second: the G♯3 note spans x 120–240 with its block at y ≈ 175, and
 * a semitone is about 21 px tall.
 */
const ANALYSIS = {
  durationMs: 10_000,
  tunedMidi: new Float32Array(),
  notes: [
    { midi: G_SHARP_3, startMs: 2000, endMs: 4000, centsFromGrid: 7 },
    { midi: C_4, startMs: 6000, endMs: 8000, centsFromGrid: -3 },
  ] as TakeNote[],
} as TakeAnalysis

const G_SHARP_3_LABEL = `${midiToNoteLabel(G_SHARP_3).label} +7¢`

function mountMap() {
  return mount(MelodyMap, {
    props: { analysis: ANALYSIS, playheadMs: 0 },
    global: {
      plugins: [
        createPinia(),
        createI18n({ legacy: false, locale: 'en', messages: { en } }),
      ],
    },
  })
}

async function tap(
  wrapper: ReturnType<typeof mountMap>,
  clientX: number,
  clientY: number,
) {
  const scroller = wrapper.get(SCROLLER)
  await scroller.trigger('pointerdown', { pointerType: 'touch' })
  await scroller.trigger('click', { clientX, clientY })
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('MelodyMap - note label', () => {
  test('should show the tapped note on touch and still seek', async () => {
    const wrapper = mountMap()

    await tap(wrapper, 180, 175)

    expect(wrapper.get(TOOLTIP).text()).toBe(G_SHARP_3_LABEL)
    expect(wrapper.get(TOOLTIP).attributes('data-touch')).toBe('true')
    expect(wrapper.emitted('seek')).toEqual([[3000]])
  })

  test('should accept a tap a fingertip away from the block', async () => {
    const wrapper = mountMap()

    /* 15 px below the block and 10 px past its end. */
    await tap(wrapper, 250, 190)

    expect(wrapper.get(TOOLTIP).text()).toBe(G_SHARP_3_LABEL)
  })

  test('should hide the tapped label after a few seconds', async () => {
    const wrapper = mountMap()

    await tap(wrapper, 180, 175)
    vi.advanceTimersByTime(3000)
    await nextTick()

    expect(wrapper.find(TOOLTIP).exists()).toBe(false)
  })

  test('should hide the tapped label when the map scrolls', async () => {
    const wrapper = mountMap()

    await tap(wrapper, 180, 175)
    await wrapper.get(SCROLLER).trigger('scroll')

    expect(wrapper.find(TOOLTIP).exists()).toBe(false)
  })

  test('should show no label for a tap on empty space, but still seek', async () => {
    const wrapper = mountMap()

    await tap(wrapper, 300, 175)

    expect(wrapper.find(TOOLTIP).exists()).toBe(false)
    expect(wrapper.emitted('seek')).toEqual([[5000]])
  })

  test('should not show a label while a finger moves over the map', async () => {
    const wrapper = mountMap()

    await wrapper.get(SCROLLER).trigger('pointermove', {
      pointerType: 'touch',
      clientX: 180,
      clientY: 175,
    })

    expect(wrapper.find(TOOLTIP).exists()).toBe(false)
  })

  test('should show the hovered note for a mouse, within the block only', async () => {
    const wrapper = mountMap()
    const scroller = wrapper.get(SCROLLER)

    await scroller.trigger('pointermove', {
      pointerType: 'mouse',
      clientX: 180,
      clientY: 175,
    })
    expect(wrapper.get(TOOLTIP).text()).toBe(G_SHARP_3_LABEL)
    expect(wrapper.get(TOOLTIP).attributes('data-touch')).toBe('false')

    await scroller.trigger('pointermove', {
      pointerType: 'mouse',
      clientX: 180,
      clientY: 190,
    })
    expect(wrapper.find(TOOLTIP).exists()).toBe(false)
  })
})
