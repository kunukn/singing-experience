import { describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import { buildPianoLayout } from '@/components/piano/pianoLayout'
import SingTheKeysLane from './SingTheKeysLane.vue'
import type { TimelineNote } from './singTheKeysTimeline'

/* C4–G4 at the default 24px unit; lane 300px tall over a 3000ms lookahead, so
 * 1ms = 0.1px. */
const layout = buildPianoLayout(60, 67)
const LANE_HEIGHT = 300

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
      beatLines: [],
      beatFlash: null,
      beatLight: null,
      ...props,
    },
  })
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
    const wrapper = mountLane({ elapsedMs: 1300, activeNoteIndex: 2 })

    expect(
      wrapper.get('[data-testid="lane-note-0"]').attributes('data-status'),
    ).toBe('missed')
  })

  test('should mark a passed note as passed, not missed, when unscored', () => {
    const wrapper = mountLane({
      elapsedMs: 1300,
      activeNoteIndex: 2,
      isScored: false,
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

  test('should not light the hit line without a beat light', () => {
    expect(
      mountLane().find('[data-testid="sing-the-keys-beat-light"]').exists(),
    ).toBe(false)
  })

  test.each([
    { pulseInBar: 0, progress: 0, intensity: '1.00' },
    { pulseInBar: 2, progress: 0.5, intensity: '0.50' },
    { pulseInBar: 3, progress: 1, intensity: '0.00' },
  ])(
    'should light the hit line for pulse $pulseInBar at $intensity',
    ({ pulseInBar, progress, intensity }) => {
      const light = mountLane({
        beatLight: {
          pulseInBar,
          isBarStart: pulseInBar === 0,
          sinceMs: 0,
          progress,
        },
      }).get('[data-testid="sing-the-keys-beat-light"]')

      expect(light.attributes('data-pulse')).toBe(String(pulseInBar))
      expect(light.attributes('data-intensity')).toBe(intensity)
    },
  )

  test('should thicken the hit line most on the downbeat', () => {
    const heightFor = (isBarStart: boolean) =>
      pxOf(
        mountLane({
          beatLight: {
            pulseInBar: isBarStart ? 0 : 1,
            isBarStart,
            sinceMs: 0,
            progress: 0,
          },
        })
          .get('[data-testid="sing-the-keys-beat-light"]')
          .attributes('style'),
        'height',
      )

    expect(heightFor(true)).toBeGreaterThan(heightFor(false))
  })
})
