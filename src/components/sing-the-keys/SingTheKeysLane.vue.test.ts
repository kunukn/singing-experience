import { describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import {
  buildPianoLayout,
  PIANO_LABEL_BAND_HEIGHT,
} from '@/components/piano/pianoLayout'
import SingTheKeysLane from './SingTheKeysLane.vue'
import type { TimelineNote } from './singTheKeysTimeline'

/* C4–G4 at the default 24px unit; lane 300px tall over a 3000ms lookahead, so
 * 1ms = 0.1px. */
const layout = buildPianoLayout(60, 67)
const LANE_HEIGHT = 300

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })

const notes: TimelineNote[] = [
  { index: 0, midi: 60, startMs: 0, durationMs: 600 },
  { index: 1, midi: 61, startMs: 600, durationMs: 300 },
  { index: 2, midi: 64, startMs: 1200, durationMs: 1200 },
]

function mountLane(
  props: Partial<InstanceType<typeof SingTheKeysLane>['$props']> = {},
) {
  return mount(SingTheKeysLane, {
    props: {
      notes,
      layout,
      laneHeight: LANE_HEIGHT,
      elapsedMs: 0,
      activeNoteIndex: null,
      correctNoteIndices: [],
      accidentalStyle: 'sharp',
      sungMidi: null,
      sungFrequency: null,
      isScored: true,
      isShowingEnding: false,
      isEndingSettled: false,
      areBlocksPressable: true,
      beatLines: [],
      beatFlash: null,
      isPlaying: false,
      isScrollable: false,
      scrollMaxMs: 0,
      ...props,
    },
    global: { plugins: [i18n] },
  })
}

/* useLaneScroll attaches its listeners once the lane's template ref is set,
 * a tick after mount; input tests wait for that. */
async function mountLaneForInput(props: Parameters<typeof mountLane>[0] = {}) {
  const wrapper = mountLane(props)
  await nextTick()

  return wrapper
}

function pxOf(style: string | undefined, property: string): number {
  const match = new RegExp(`${property}:\\s*(-?[\\d.]+)px`).exec(style ?? '')

  return Number(match?.[1])
}

describe('SingTheKeysLane', () => {
  test('should render one block per note', () => {
    const wrapper = mountLane()

    expect(wrapper.findAll('[data-testid^="lane-note-"]')).toHaveLength(3)
  })

  test('should size and stack blocks from their timing', () => {
    const wrapper = mountLane()
    const first = wrapper.get('[data-testid="lane-note-0"]').attributes('style')
    const third = wrapper.get('[data-testid="lane-note-2"]').attributes('style')

    /* Note 0 spans 0–600ms → 60px tall (minus the 2px gap), bottom on the hit
     * line: top = 300 − 60 = 240. */
    expect(pxOf(first, 'height')).toBe(58)
    expect(pxOf(first, 'top')).toBe(240)
    /* Note 2 spans 1200–2400ms → top = 300 − 240 = 60, 120px tall. */
    expect(pxOf(third, 'top')).toBe(60)
    expect(pxOf(third, 'height')).toBe(118)
  })

  test('should give naturals and accidentals the same block width', () => {
    const wrapper = mountLane()
    const natural = wrapper
      .get('[data-testid="lane-note-0"]')
      .attributes('style')
    const accidental = wrapper
      .get('[data-testid="lane-note-1"]')
      .attributes('style')

    expect(pxOf(accidental, 'width')).toBeCloseTo(pxOf(natural, 'width'))
  })

  test('should report each note status', () => {
    const wrapper = mountLane({
      elapsedMs: 700,
      activeNoteIndex: 1,
      correctNoteIndices: [0],
    })

    expect(
      wrapper.get('[data-testid="lane-note-0"]').attributes('data-status'),
    ).toBe('correct')
    expect(
      wrapper.get('[data-testid="lane-note-1"]').attributes('data-status'),
    ).toBe('active')
    expect(
      wrapper.get('[data-testid="lane-note-2"]').attributes('data-status'),
    ).toBe('upcoming')
  })

  test('should mark a passed note that was never hit as missed', () => {
    const wrapper = mountLane({
      elapsedMs: 1300,
      activeNoteIndex: 2,
      isPlaying: true,
    })

    expect(
      wrapper.get('[data-testid="lane-note-0"]').attributes('data-status'),
    ).toBe('missed')
  })

  test('should emit the block midi when a block is tapped', async () => {
    const wrapper = await mountLaneForInput()
    const block = wrapper.get('[data-testid="lane-note-1"]')

    await block.trigger('pointerdown', { button: 0, pointerId: 1 })
    await block.trigger('pointerup', { button: 0, pointerId: 1 })

    expect(wrapper.emitted('blockPress')).toEqual([
      [Number(block.attributes('data-midi'))],
    ])
  })

  test('should ignore block presses while blocks are not pressable', async () => {
    const wrapper = await mountLaneForInput({ areBlocksPressable: false })
    const block = wrapper.get('[data-testid="lane-note-1"]')
    await block.trigger('pointerdown', { button: 0, pointerId: 1 })
    await block.trigger('pointerup', { button: 0, pointerId: 1 })

    expect(wrapper.emitted('blockPress')).toBeUndefined()
  })

  test('should mark a passed note as passed, not missed, when unscored', () => {
    const wrapper = mountLane({
      elapsedMs: 1300,
      activeNoteIndex: 2,
      isScored: false,
      isPlaying: true,
    })

    expect(
      wrapper.get('[data-testid="lane-note-0"]').attributes('data-status'),
    ).toBe('passed')
  })

  test('should mark every unhit note missed while showing the ending', () => {
    const wrapper = mountLane({
      elapsedMs: 0,
      correctNoteIndices: [0],
      isShowingEnding: true,
    })

    expect(
      wrapper.get('[data-testid="lane-note-0"]').attributes('data-status'),
    ).toBe('correct')
    expect(
      wrapper.get('[data-testid="lane-note-2"]').attributes('data-status'),
    ).toBe('missed')
  })

  test('should clip blocks at the top of the keys, and at the hit line once the ending settles', () => {
    const laneHeightOf = (props: {
      isShowingEnding: boolean
      isEndingSettled: boolean
    }) =>
      pxOf(
        mountLane(props)
          .get('[data-testid="sing-the-keys-lane"]')
          .attributes('style'),
        'height',
      )

    /* While playing, and while the ending still falls and glides back, the
     * tail runs through the label band and stops at the top of the keys. */
    expect(
      laneHeightOf({ isShowingEnding: false, isEndingSettled: false }),
    ).toBe(LANE_HEIGHT + PIANO_LABEL_BAND_HEIGHT)
    expect(
      laneHeightOf({ isShowingEnding: true, isEndingSettled: false }),
    ).toBe(LANE_HEIGHT + PIANO_LABEL_BAND_HEIGHT)
    expect(laneHeightOf({ isShowingEnding: true, isEndingSettled: true })).toBe(
      LANE_HEIGHT,
    )
  })

  test('should spell the label after the accidental style', () => {
    expect(
      mountLane({ accidentalStyle: 'sharp' })
        .get('[data-testid="lane-note-1"]')
        .text(),
    ).toBe('C♯')
    expect(
      mountLane({ accidentalStyle: 'flat' })
        .get('[data-testid="lane-note-1"]')
        .text(),
    ).toBe('D♭')
  })

  test('should draw the sung line only while a pitch is detected', () => {
    expect(
      mountLane().find('[data-testid="sing-the-keys-sung-line"]').exists(),
    ).toBe(false)
    expect(
      mountLane({ sungMidi: 62, sungFrequency: 293.66 })
        .find('[data-testid="sing-the-keys-sung-line"]')
        .exists(),
    ).toBe(true)
  })

  test('should draw a beat line per pulse, marking bar starts', () => {
    const wrapper = mountLane({
      beatLines: [
        { ms: 0, pulseInBar: 0, isBarStart: true },
        { ms: 600, pulseInBar: 1, isBarStart: false },
      ],
    })
    const lines = wrapper.findAll('[data-testid="sing-the-keys-beat-line"]')

    expect(lines).toHaveLength(2)
    expect(lines[0].attributes('data-bar')).toBe('true')
    expect(lines[1].attributes('data-bar')).toBe('false')
    /* 600ms × 0.1px/ms = 60px above the 300px hit line. */
    expect(pxOf(lines[0].attributes('style'), 'top')).toBe(300)
    expect(pxOf(lines[1].attributes('style'), 'top')).toBe(240)
  })

  test('should draw no beat lines when given none', () => {
    expect(
      mountLane().find('[data-testid="sing-the-keys-beat-line"]').exists(),
    ).toBe(false)
  })

  test.each([
    { beatFlash: null, expected: 0 },
    { beatFlash: { intensity: 1, isBarStart: true }, expected: 1 },
    { beatFlash: { intensity: 1, isBarStart: false }, expected: 0.6 },
    { beatFlash: { intensity: 0.5, isBarStart: true }, expected: 0.5 },
  ])(
    'should glow the hit line at $expected for $beatFlash',
    ({ beatFlash, expected }) => {
      const style = mountLane({ beatFlash })
        .get('[data-testid="sing-the-keys-beat-flash"]')
        .attributes('style')
      const opacity = Number(/opacity:\s*([\d.]+)/.exec(style ?? '')?.[1])

      expect(opacity).toBeCloseTo(expected)
    },
  )
})

/* 300px lane over a 3000ms lookahead: 1px of wheel or drag = 10ms of song. */
describe('SingTheKeysLane - scrolling', () => {
  const scrollable = { isScrollable: true, scrollMaxMs: 5000 }

  function dispatchWheel(
    wrapper: ReturnType<typeof mountLane>,
    init: WheelEventInit,
  ) {
    const event = new WheelEvent('wheel', { cancelable: true, ...init })
    wrapper
      .get('[data-testid="sing-the-keys-lane"]')
      .element.dispatchEvent(event)

    return event
  }

  test.each([
    { deltaY: 100, expected: 1000 },
    { deltaY: 1000, expected: 5000 },
  ])(
    'should scroll ahead to $expected ms on a wheel down of $deltaY px',
    async ({ deltaY, expected }) => {
      const wrapper = await mountLaneForInput(scrollable)

      const event = dispatchWheel(wrapper, { deltaY })

      expect(wrapper.emitted('scrollTo')).toEqual([[expected]])
      expect(event.defaultPrevented).toBe(true)
    },
  )

  test('should let the page scroll when the wheel is at the start', async () => {
    const wrapper = await mountLaneForInput(scrollable)

    const event = dispatchWheel(wrapper, { deltaY: -100 })

    expect(wrapper.emitted('scrollTo')).toBeUndefined()
    expect(event.defaultPrevented).toBe(false)
  })

  test.each([
    { name: 'not scrollable', props: {}, init: { deltaY: 100 } },
    {
      name: 'mostly sideways',
      props: scrollable,
      init: { deltaX: 80, deltaY: 10 },
    },
  ])('should ignore the wheel when $name', async ({ props, init }) => {
    const wrapper = await mountLaneForInput(props)

    dispatchWheel(wrapper, init)

    expect(wrapper.emitted('scrollTo')).toBeUndefined()
  })

  test('should scroll ahead when dragged down', async () => {
    const wrapper = await mountLaneForInput(scrollable)
    const lane = wrapper.get('[data-testid="sing-the-keys-lane"]')

    await lane.trigger('pointerdown', { button: 0, pointerId: 1, clientY: 100 })
    await lane.trigger('pointermove', { pointerId: 1, clientY: 130 })
    await lane.trigger('pointerup', { button: 0, pointerId: 1, clientY: 130 })

    expect(wrapper.emitted('scrollTo')).toEqual([[300]])
  })

  test('should not sound a block when a drag starts on it', async () => {
    const wrapper = await mountLaneForInput(scrollable)
    const block = wrapper.get('[data-testid="lane-note-1"]')

    await block.trigger('pointerdown', {
      button: 0,
      pointerId: 1,
      clientY: 100,
    })
    await block.trigger('pointermove', { pointerId: 1, clientY: 130 })
    await block.trigger('pointerup', { button: 0, pointerId: 1, clientY: 130 })

    expect(wrapper.emitted('blockPress')).toBeUndefined()
    expect(wrapper.emitted('scrollTo')).toEqual([[300]])
  })

  test.each([
    { key: 'End', expected: 5000 },
    { key: 'Home', expected: 0 },
    { key: 'ArrowDown', expected: 2500 },
    { key: 'ArrowUp', expected: 1500 },
  ])('should scroll to $expected ms on $key', async ({ key, expected }) => {
    const wrapper = await mountLaneForInput({ ...scrollable, elapsedMs: 2000 })

    await wrapper
      .get('[data-testid="sing-the-keys-lane"]')
      .trigger('keydown', { key })

    expect(wrapper.emitted('scrollTo')).toEqual([[expected]])
  })

  test('should keep blocks scrolled past the hit line upcoming outside a run', () => {
    const wrapper = mountLane({ ...scrollable, elapsedMs: 1300 })

    expect(
      wrapper.get('[data-testid="lane-note-0"]').attributes('data-status'),
    ).toBe('upcoming')
  })

  test.each([
    {
      name: 'not scrollable',
      props: { isScrollable: false, scrollMaxMs: 5000 },
    },
    {
      name: 'the song fits the lane',
      props: { isScrollable: true, scrollMaxMs: 0 },
    },
  ])('should show no position bar when $name', ({ props }) => {
    expect(
      mountLane(props)
        .find('[data-testid="sing-the-keys-scroll-thumb"]')
        .exists(),
    ).toBe(false)
  })

  /* 3000 of 8000ms on screen: the thumb is 3/8 of the 300px lane. */
  test.each([
    { elapsedMs: 0, top: 187.5, progress: '0.00' },
    { elapsedMs: 5000, top: 0, progress: '1.00' },
  ])(
    'should place the position bar at $top px for $elapsedMs ms',
    ({ elapsedMs, top, progress }) => {
      const thumb = mountLane({ ...scrollable, elapsedMs }).get(
        '[data-testid="sing-the-keys-scroll-thumb"]',
      )

      expect(pxOf(thumb.attributes('style'), 'height')).toBeCloseTo(112.5)
      expect(pxOf(thumb.attributes('style'), 'top')).toBeCloseTo(top)
      expect(thumb.attributes('data-progress')).toBe(progress)
    },
  )
})
