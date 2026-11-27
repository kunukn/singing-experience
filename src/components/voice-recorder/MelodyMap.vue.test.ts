import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import type { TakeAnalysis } from './analyzeTake'
import MelodyMap from './MelodyMap.vue'
import { contentWidthFor, timeToContentX } from './melodyMapGeometry'
import type { TakeNote } from './takeNotes'

const TOOLTIP = '[data-testid="melody-map-tooltip"]'
const SCROLLER = '[role="img"]'
const G_SHARP_3 = 56
const C_4 = 60

const DURATION_MS = 10_000

/*
 * Only the fields the map's pointer handling reads. happy-dom has no canvas
 * context, so nothing is drawn and the pitch track is never asked for.
 */
const ANALYSIS = {
  durationMs: DURATION_MS,
  tunedMidi: new Float32Array(),
  notes: [
    { midi: G_SHARP_3, startMs: 2000, endMs: 4000, centsFromGrid: 7 },
    { midi: C_4, startMs: 6000, endMs: 8000, centsFromGrid: -3 },
  ] as TakeNote[],
} as TakeAnalysis

const G_SHARP_3_LABEL = 'G♯3 +7¢'

/* happy-dom lays nothing out: the scroller is 0 px wide and sits at 0,0, so
 * the map is as wide as the take is long and client x equals content x. */
const TIME_AXIS = {
  durationMs: DURATION_MS,
  contentWidth: contentWidthFor(DURATION_MS, 0),
  isRtl: false,
}

function xAt(timeMs: number): number {
  return timeToContentX(timeMs, TIME_AXIS)
}

/* Taller than the map, so the sweep below crosses every row. */
const SWEEP_HEIGHT_PX = 400
/* px past the block's edge: outside it for a mouse, well inside a fingertip. */
const JUST_OUTSIDE_PX = 3

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

async function hover(
  wrapper: ReturnType<typeof mountMap>,
  clientX: number,
  clientY: number,
) {
  await wrapper.get(SCROLLER).trigger('pointermove', {
    pointerType: 'mouse',
    clientX,
    clientY,
  })
}

/* Where the G♯3 block sits, found by sweeping a mouse down the map through the
 * middle of the note, so the tests don't restate the map's private layout. */
async function findGSharpBlock(wrapper: ReturnType<typeof mountMap>) {
  const rows: number[] = []
  for (let y = 0; y < SWEEP_HEIGHT_PX; y++) {
    await hover(wrapper, xAt(3000), y)
    if (wrapper.find(TOOLTIP).exists()) rows.push(y)
  }
  await wrapper.get(SCROLLER).trigger('pointerleave', { pointerType: 'mouse' })

  const top = rows[0]
  const bottom = rows[rows.length - 1]

  return { centerY: (top + bottom) / 2, bottom }
}

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('MelodyMap - note label', () => {
  test('should show the tapped note on touch and still seek', async () => {
    const wrapper = mountMap()
    const block = await findGSharpBlock(wrapper)

    await tap(wrapper, xAt(3000), block.centerY)

    expect(wrapper.get(TOOLTIP).text()).toBe(G_SHARP_3_LABEL)
    expect(wrapper.get(TOOLTIP).attributes('data-touch')).toBe('true')
    expect(wrapper.emitted('seek')).toEqual([[3000]])
  })

  test('should accept a tap a fingertip away from the block', async () => {
    const wrapper = mountMap()
    const block = await findGSharpBlock(wrapper)
    const outside = {
      x: xAt(4000) + JUST_OUTSIDE_PX,
      y: block.bottom + JUST_OUTSIDE_PX,
    }

    /* Below the block and past its end: a mouse there is off the note. */
    await hover(wrapper, outside.x, outside.y)
    expect(wrapper.find(TOOLTIP).exists()).toBe(false)

    await tap(wrapper, outside.x, outside.y)

    expect(wrapper.get(TOOLTIP).text()).toBe(G_SHARP_3_LABEL)
  })

  test('should hide the tapped label after a few seconds', async () => {
    const wrapper = mountMap()
    const block = await findGSharpBlock(wrapper)

    await tap(wrapper, xAt(3000), block.centerY)
    expect(wrapper.find(TOOLTIP).exists()).toBe(true)

    vi.advanceTimersByTime(3000)
    await nextTick()

    expect(wrapper.find(TOOLTIP).exists()).toBe(false)
  })

  test('should hide the tapped label when the map scrolls', async () => {
    const wrapper = mountMap()
    const block = await findGSharpBlock(wrapper)

    await tap(wrapper, xAt(3000), block.centerY)
    expect(wrapper.find(TOOLTIP).exists()).toBe(true)

    await wrapper.get(SCROLLER).trigger('scroll')

    expect(wrapper.find(TOOLTIP).exists()).toBe(false)
  })

  test('should show no label for a tap on empty space, but still seek', async () => {
    const wrapper = mountMap()
    const block = await findGSharpBlock(wrapper)

    /* On the G♯3 row, in the gap between the two notes. */
    await tap(wrapper, xAt(5000), block.centerY)

    expect(wrapper.find(TOOLTIP).exists()).toBe(false)
    expect(wrapper.emitted('seek')).toEqual([[5000]])
  })

  test('should not show a label while a finger moves over the map', async () => {
    const wrapper = mountMap()
    const block = await findGSharpBlock(wrapper)

    await wrapper.get(SCROLLER).trigger('pointermove', {
      pointerType: 'touch',
      clientX: xAt(3000),
      clientY: block.centerY,
    })

    expect(wrapper.find(TOOLTIP).exists()).toBe(false)
  })

  test('should show the hovered note for a mouse, within the block only', async () => {
    const wrapper = mountMap()
    const block = await findGSharpBlock(wrapper)

    await hover(wrapper, xAt(3000), block.centerY)
    expect(wrapper.get(TOOLTIP).text()).toBe(G_SHARP_3_LABEL)
    expect(wrapper.get(TOOLTIP).attributes('data-touch')).toBe('false')

    await hover(wrapper, xAt(3000), block.bottom + JUST_OUTSIDE_PX)
    expect(wrapper.find(TOOLTIP).exists()).toBe(false)
  })
})
