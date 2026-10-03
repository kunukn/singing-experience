import { describe, expect, test, vi } from 'vitest'
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
      isOnPitch: false,
      isHitEffectsEnabled: true,
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

  test('should cents-colour the sung line only when asked to', () => {
    /* D4 sung 20¢ sharp — 1200 cents per octave */
    const sung = { sungMidi: 62.2, sungFrequency: 293.66 * 2 ** (20 / 1200) }
    const styleOf = (shouldColorByCents: boolean) =>
      mountLane({ ...sung, shouldColorByCents })
        .get('[data-testid="sing-the-keys-sung-line"]')
        .attributes('style')

    expect(styleOf(true)).toContain('border-color')
    expect(styleOf(false)).not.toContain('border-color')
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

  test('should burst on the hit line when a note is collected mid-run', async () => {
    const wrapper = mountLane({ isPlaying: true, activeNoteIndex: 0 })

    await wrapper.setProps({ correctNoteIndices: [0] })

    expect(
      wrapper
        .get('[data-testid="sing-the-keys-hit-burst"]')
        .attributes('data-note-index'),
    ).toBe('0')
  })

  test('should hold the hit glow only while the singer is on pitch', async () => {
    const wrapper = mountLane({
      isPlaying: true,
      activeNoteIndex: 0,
      correctNoteIndices: [0],
      isOnPitch: true,
    })
    const sustain = wrapper.get('[data-testid="sing-the-keys-hit-sustain"]')

    expect(sustain.attributes('data-held')).toBe('true')

    await wrapper.setProps({ isOnPitch: false })

    expect(sustain.attributes('data-held')).toBe('false')
  })

  test('should light the collected block from the hit line', () => {
    /* Note 0 runs 0–600ms; at 200ms, 400ms of it (40px) is still above the
     * line. The beam is 120px tall with its foot on the line: 40 − 120. */
    const wrapper = mountLane({
      isPlaying: true,
      elapsedMs: 200,
      activeNoteIndex: 0,
      correctNoteIndices: [0],
      isOnPitch: true,
    })
    const beams = wrapper.findAll('[data-testid="sing-the-keys-hit-beam"]')

    expect(beams).toHaveLength(1)
    expect(
      wrapper
        .get('[data-testid="lane-note-0"]')
        .find('[data-testid="sing-the-keys-hit-beam"]')
        .exists(),
    ).toBe(true)
    expect(beams[0]?.attributes('data-held')).toBe('true')
    expect(beams[0]?.html()).toContain('translateY(-80px)')
  })

  test('should dim the block light when the singer leaves the pitch', () => {
    const wrapper = mountLane({
      isPlaying: true,
      activeNoteIndex: 0,
      correctNoteIndices: [0],
      isOnPitch: false,
    })

    expect(
      wrapper
        .get('[data-testid="sing-the-keys-hit-beam"]')
        .attributes('data-held'),
    ).toBe('false')
  })

  test.each([
    { name: 'the due note is not collected yet', props: {} },
    {
      name: 'the collected note is no longer due',
      props: { correctNoteIndices: [0], activeNoteIndex: 1 },
    },
    {
      name: 'no run is under way',
      props: { correctNoteIndices: [0], isPlaying: false },
    },
  ])('should not light a block when $name', ({ props }) => {
    const wrapper = mountLane({
      isPlaying: true,
      activeNoteIndex: 0,
      isOnPitch: true,
      ...props,
    })

    expect(
      wrapper.find('[data-testid="sing-the-keys-hit-beam"]').exists(),
    ).toBe(false)
  })

  test('should render no hit effects when they are turned off', async () => {
    const wrapper = mountLane({
      isHitEffectsEnabled: false,
      isPlaying: true,
      activeNoteIndex: 0,
      isOnPitch: true,
    })

    await wrapper.setProps({ correctNoteIndices: [0] })

    expect(wrapper.find('[data-testid^="sing-the-keys-hit-"]').exists()).toBe(
      false,
    )
    expect(
      wrapper.get('[data-testid="lane-note-0"]').attributes('data-status'),
    ).toBe('correct')
  })
})

/* 300px lane over a 3000ms lookahead: 1px of wheel or drag = 10ms of song. */
/* 300px lane over a 3000ms lookahead: 1px of scroll = 10ms of song. With
 * 5000ms to scroll, the song's start sits at scrollTop 500 and its end at 0. */
describe('SingTheKeysLane - scrolling', () => {
  const scrollable = { isScrollable: true, scrollMaxMs: 5000 }

  function scrollerOf(wrapper: ReturnType<typeof mountLane>) {
    return wrapper.get('[data-testid="sing-the-keys-scroller"]')
  }

  test('should offer a labelled scroller only while scrollable', async () => {
    const idle = await mountLaneForInput(scrollable)
    const playing = await mountLaneForInput({ isPlaying: true })

    expect(scrollerOf(idle).attributes('aria-label')).toBe(
      'Scroll through the song',
    )
    expect(
      playing.find('[data-testid="sing-the-keys-scroller"]').exists(),
    ).toBe(false)
  })

  test.each([
    { elapsedMs: 0, scrollTop: 500 },
    { elapsedMs: 2000, scrollTop: 300 },
    { elapsedMs: 5000, scrollTop: 0 },
  ])(
    'should open the scroller at $scrollTop px for $elapsedMs ms',
    async ({ elapsedMs, scrollTop }) => {
      const wrapper = await mountLaneForInput({ ...scrollable, elapsedMs })

      expect(scrollerOf(wrapper).element.scrollTop).toBe(scrollTop)
    },
  )

  test.each([
    { scrollTop: 200, expected: 3000 },
    { scrollTop: -40, expected: 5000 },
    { scrollTop: 560, expected: 0 },
  ])(
    'should scroll the lane to $expected ms at scrollTop $scrollTop',
    async ({ scrollTop, expected }) => {
      const wrapper = await mountLaneForInput(scrollable)
      const scroller = scrollerOf(wrapper)

      scroller.element.scrollTop = scrollTop
      await scroller.trigger('scroll')

      expect(wrapper.emitted('scrollTo')).toEqual([[expected]])
    },
  )

  /* Mid-fling the scroller has already moved on when the echo arrives;
   * writing the echo back would drag it a frame behind and stop it. */
  test('should not write its own scroll back to the scroller', async () => {
    const wrapper = await mountLaneForInput(scrollable)
    const scroller = scrollerOf(wrapper)

    scroller.element.scrollTop = 200
    await scroller.trigger('scroll')
    scroller.element.scrollTop = 190
    await wrapper.setProps({ elapsedMs: 3000 })

    expect(scroller.element.scrollTop).toBe(190)
  })

  test('should follow an elapsedMs set from outside', async () => {
    const wrapper = await mountLaneForInput({ ...scrollable, elapsedMs: 3000 })

    await wrapper.setProps({ elapsedMs: 0 })

    expect(scrollerOf(wrapper).element.scrollTop).toBe(500)
  })

  test('should scroll ahead when dragged down with a mouse', async () => {
    const wrapper = await mountLaneForInput(scrollable)
    const scroller = scrollerOf(wrapper)
    const pointer = { button: 0, pointerId: 1, pointerType: 'mouse' }

    await scroller.trigger('pointerdown', { ...pointer, clientY: 100 })
    await scroller.trigger('pointermove', { ...pointer, clientY: 130 })
    await scroller.trigger('pointerup', { ...pointer, clientY: 130 })

    expect(scroller.element.scrollTop).toBe(470)
    expect(wrapper.emitted('blockPress')).toBeUndefined()
  })

  test('should leave a touch drag to the browser', async () => {
    const wrapper = await mountLaneForInput(scrollable)
    const scroller = scrollerOf(wrapper)
    const pointer = { button: 0, pointerId: 1, pointerType: 'touch' }

    await scroller.trigger('pointerdown', { ...pointer, clientY: 100 })
    await scroller.trigger('pointermove', { ...pointer, clientY: 130 })

    expect(scroller.element.scrollTop).toBe(500)
  })

  test('should sound the block under a tap on the scroller', async () => {
    const wrapper = await mountLaneForInput(scrollable)
    const scroller = scrollerOf(wrapper)
    const block = wrapper.get('[data-testid="lane-note-1"]')
    /* happy-dom has no hit testing: stand in for the browser's answer. */
    Object.defineProperty(document, 'elementsFromPoint', {
      configurable: true,
      value: vi.fn(() => [scroller.element, block.element]),
    })

    await scroller.trigger('pointerdown', { button: 0, pointerId: 1 })
    await scroller.trigger('pointerup', { button: 0, pointerId: 1 })

    expect(wrapper.emitted('blockPress')).toEqual([
      [Number(block.attributes('data-midi'))],
    ])
    Reflect.deleteProperty(document, 'elementsFromPoint')
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
