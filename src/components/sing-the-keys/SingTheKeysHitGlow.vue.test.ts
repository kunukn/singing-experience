import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import {
  buildPianoLayout,
  pianoNoteBlockSpan,
} from '@/components/piano/pianoLayout'
import SingTheKeysHitGlow from './SingTheKeysHitGlow.vue'
import {
  BURST_LIFETIME_MS,
  SPARKS_PER_TIER,
  STREAM_SPARKS_PER_TIER,
  tierValue,
} from './singTheKeysHitEffects'
import type { TimelineNote } from './singTheKeysTimeline'

/* C4–G4 at the default unit. */
const layout = buildPianoLayout(60, 67)
const LANE_HEIGHT = 300

/* Notes 1 and 2 share a pitch; a rest follows note 3. */
const notes: TimelineNote[] = [
  { index: 0, midi: 60, startMs: 0, durationMs: 500 },
  { index: 1, midi: 62, startMs: 500, durationMs: 500 },
  { index: 2, midi: 62, startMs: 1000, durationMs: 500 },
  { index: 3, midi: 64, startMs: 1500, durationMs: 500 },
  { index: 4, midi: 65, startMs: 2500, durationMs: 500 },
]

const BURST = '[data-testid="sing-the-keys-hit-burst"]'
const SPARK = '[data-testid="sing-the-keys-hit-spark"]'
const SUSTAIN = '[data-testid="sing-the-keys-hit-sustain"]'
const STREAM_SPARK = '[data-testid="sing-the-keys-hit-stream-spark"]'

function mountGlow(
  props: Partial<InstanceType<typeof SingTheKeysHitGlow>['$props']> = {},
) {
  return mount(SingTheKeysHitGlow, {
    props: {
      notes,
      layout,
      laneHeight: LANE_HEIGHT,
      activeNoteIndex: null,
      correctNoteIndices: [],
      isPlaying: true,
      isOnPitch: false,
      ...props,
    },
  })
}

function pxOf(style: string | undefined, property: string): number {
  const match = new RegExp(`${property}:\\s*(-?[\\d.]+)px`).exec(style ?? '')

  return Number(match?.[1])
}

describe('SingTheKeysHitGlow - bursts', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('should not burst for notes already collected on mount', () => {
    const wrapper = mountGlow({ correctNoteIndices: [0, 1] })

    expect(wrapper.find(BURST).exists()).toBe(false)
  })

  test('should burst when a note is collected during a run', async () => {
    const wrapper = mountGlow()

    await wrapper.setProps({ correctNoteIndices: [0] })

    const bursts = wrapper.findAll(BURST)
    expect(bursts).toHaveLength(1)
    expect(bursts[0]?.attributes('data-note-index')).toBe('0')
  })

  test('should place the burst on the hit line at the note key', async () => {
    const wrapper = mountGlow({ correctNoteIndices: [0] })

    await wrapper.setProps({ correctNoteIndices: [0, 1] })

    const style = wrapper
      .get(`${BURST}[data-note-index="1"]`)
      .attributes('style')
    const span = pianoNoteBlockSpan(layout, 62)
    expect(pxOf(style, 'inset-inline-start')).toBeCloseTo(
      span.leftPx + span.widthPx / 2,
    )
    expect(pxOf(style, 'top')).toBe(LANE_HEIGHT - 1)
  })

  test('should place the burst at the collected note, not the due one', async () => {
    const wrapper = mountGlow({ activeNoteIndex: 3 })

    await wrapper.setProps({ correctNoteIndices: [0] })

    const span = pianoNoteBlockSpan(layout, 60)
    expect(
      pxOf(wrapper.get(BURST).attributes('style'), 'inset-inline-start'),
    ).toBeCloseTo(span.leftPx + span.widthPx / 2)
  })

  test('should not burst when notes appear outside a run', async () => {
    const wrapper = mountGlow({ isPlaying: false })

    await wrapper.setProps({ correctNoteIndices: [0, 1, 2] })

    expect(wrapper.find(BURST).exists()).toBe(false)
  })

  test('should not burst when the collected notes are cleared', async () => {
    const wrapper = mountGlow({ correctNoteIndices: [0, 1] })

    await wrapper.setProps({ correctNoteIndices: [] })

    expect(wrapper.find(BURST).exists()).toBe(false)
  })

  test('should not burst when a run ends with its notes kept', async () => {
    const wrapper = mountGlow({ correctNoteIndices: [0, 1] })

    await wrapper.setProps({ isPlaying: false, correctNoteIndices: [0, 1] })

    expect(wrapper.find(BURST).exists()).toBe(false)
  })

  test('should grow the burst on the third hit in a row', async () => {
    const wrapper = mountGlow({ correctNoteIndices: [0, 1] })

    await wrapper.setProps({ correctNoteIndices: [0, 1, 2] })

    const burst = wrapper.get(BURST)
    expect(burst.attributes('data-tier')).toBe('1')
    expect(burst.findAll(SPARK)).toHaveLength(tierValue(SPARKS_PER_TIER, 1))
  })

  test('should shrink the burst back after a missed note', async () => {
    const wrapper = mountGlow({ correctNoteIndices: [0, 1, 2] })

    await wrapper.setProps({ correctNoteIndices: [0, 1, 2, 4] })

    const burst = wrapper.get(BURST)
    expect(burst.attributes('data-tier')).toBe('0')
    expect(burst.findAll(SPARK)).toHaveLength(tierValue(SPARKS_PER_TIER, 0))
  })

  test('should remove the burst once its sparks have landed', async () => {
    const wrapper = mountGlow()
    await wrapper.setProps({ correctNoteIndices: [0] })

    vi.advanceTimersByTime(BURST_LIFETIME_MS - 1)
    await wrapper.vm.$nextTick()
    expect(wrapper.find(BURST).exists()).toBe(true)

    vi.advanceTimersByTime(1)
    await wrapper.vm.$nextTick()
    expect(wrapper.find(BURST).exists()).toBe(false)
  })

  test('should let a burst finish when the run stops', async () => {
    const wrapper = mountGlow()
    await wrapper.setProps({ correctNoteIndices: [0] })

    await wrapper.setProps({ isPlaying: false, correctNoteIndices: [] })

    expect(wrapper.find(BURST).exists()).toBe(true)
  })

  test('should keep overlapping bursts apart', async () => {
    const wrapper = mountGlow()

    await wrapper.setProps({ correctNoteIndices: [0] })
    vi.advanceTimersByTime(BURST_LIFETIME_MS / 2)
    await wrapper.setProps({ correctNoteIndices: [0, 1] })
    expect(wrapper.findAll(BURST)).toHaveLength(2)

    vi.advanceTimersByTime(BURST_LIFETIME_MS / 2)
    await wrapper.vm.$nextTick()

    const remaining = wrapper.findAll(BURST)
    expect(remaining).toHaveLength(1)
    expect(remaining[0]?.attributes('data-note-index')).toBe('1')
  })
})

describe('SingTheKeysHitGlow - sustained glow', () => {
  test('should glow for the due note once it is collected', () => {
    const wrapper = mountGlow({
      activeNoteIndex: 1,
      correctNoteIndices: [0, 1],
      isOnPitch: true,
    })

    const sustain = wrapper.get(SUSTAIN)
    const span = pianoNoteBlockSpan(layout, 62)
    expect(sustain.attributes('data-note-index')).toBe('1')
    expect(sustain.attributes('data-held')).toBe('true')
    expect(pxOf(sustain.attributes('style'), 'inset-inline-start')).toBeCloseTo(
      span.leftPx + span.widthPx / 2,
    )
  })

  test('should let go when the singer leaves the pitch', async () => {
    const wrapper = mountGlow({
      activeNoteIndex: 0,
      correctNoteIndices: [0],
      isOnPitch: true,
    })

    await wrapper.setProps({ isOnPitch: false })

    expect(wrapper.get(SUSTAIN).attributes('data-held')).toBe('false')
  })

  test('should report the run it belongs to', () => {
    const wrapper = mountGlow({
      activeNoteIndex: 2,
      correctNoteIndices: [0, 1, 2],
      isOnPitch: true,
    })

    expect(wrapper.get(SUSTAIN).attributes('data-tier')).toBe('1')
  })

  test('should keep a stream of sparks going for the held note', () => {
    const wrapper = mountGlow({
      activeNoteIndex: 0,
      correctNoteIndices: [0],
      isOnPitch: true,
    })

    expect(wrapper.get(SUSTAIN).findAll(STREAM_SPARK)).toHaveLength(
      tierValue(STREAM_SPARKS_PER_TIER, 0),
    )
  })

  test('should thicken the stream with the run', () => {
    const wrapper = mountGlow({
      activeNoteIndex: 2,
      correctNoteIndices: [0, 1, 2],
      isOnPitch: true,
    })

    expect(wrapper.get(SUSTAIN).findAll(STREAM_SPARK)).toHaveLength(
      tierValue(STREAM_SPARKS_PER_TIER, 1),
    )
  })

  test('should not glow before the due note is collected', () => {
    const wrapper = mountGlow({
      activeNoteIndex: 1,
      correctNoteIndices: [0],
      isOnPitch: true,
    })

    expect(wrapper.find(SUSTAIN).exists()).toBe(false)
  })

  test('should not carry the glow over to a repeated pitch', async () => {
    const wrapper = mountGlow({
      activeNoteIndex: 1,
      correctNoteIndices: [0, 1],
      isOnPitch: true,
    })

    await wrapper.setProps({ activeNoteIndex: 2 })

    expect(wrapper.find(SUSTAIN).exists()).toBe(false)
  })

  test('should not glow during a rest', async () => {
    const wrapper = mountGlow({
      activeNoteIndex: 3,
      correctNoteIndices: [3],
      isOnPitch: true,
    })

    await wrapper.setProps({ activeNoteIndex: null })

    expect(wrapper.find(SUSTAIN).exists()).toBe(false)
  })

  test('should not glow outside a run', () => {
    const wrapper = mountGlow({
      isPlaying: false,
      activeNoteIndex: 0,
      correctNoteIndices: [0],
      isOnPitch: true,
    })

    expect(wrapper.find(SUSTAIN).exists()).toBe(false)
  })
})
