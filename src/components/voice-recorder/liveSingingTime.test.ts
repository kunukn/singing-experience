import { describe, expect, test } from 'vitest'

import {
  createClearSingingCounter,
  displaySeconds,
  LIVE_READY_MS,
  type LiveFrame,
} from './liveSingingTime'
import { MIN_RATED_VOICED_MS } from './takeRating'

/* One animation frame at 60 fps. */
const FRAME_MS = 17

const SINGING: LiveFrame = { pitchHz: 220, clarity: 0.95, isSound: true }

function createHarness() {
  const counter = createClearSingingCounter()
  let nowMs = 0

  function feed(frame: LiveFrame, durationMs: number) {
    const end = nowMs + durationMs
    while (nowMs < end) {
      nowMs += FRAME_MS
      counter.push(frame, nowMs)
    }
  }

  function skip(gapMs: number) {
    nowMs += gapMs
  }

  return { counter, feed, skip }
}

describe('createClearSingingCounter', () => {
  test('counts steady clear singing', () => {
    const { counter, feed } = createHarness()

    feed(SINGING, 2000)

    expect(counter.clearMs).toBeGreaterThan(1900)
    expect(counter.clearMs).toBeLessThanOrEqual(2000)
  })

  test.each([
    { name: 'unclear pitch', frame: { ...SINGING, clarity: 0.85 } },
    { name: 'pitch below the voice range', frame: { ...SINGING, pitchHz: 40 } },
    {
      name: 'pitch above the voice range',
      frame: { ...SINGING, pitchHz: 2000 },
    },
    { name: 'sound under the floor', frame: { ...SINGING, isSound: false } },
  ])('ignores $name', ({ frame }) => {
    const { counter, feed } = createHarness()

    feed(frame, 2000)

    expect(counter.clearMs).toBe(0)
  })

  test('ignores a blip shorter than the onset debounce', () => {
    const { counter, feed } = createHarness()

    feed(SINGING, FRAME_MS * 2)

    expect(counter.clearMs).toBe(0)
  })

  test('stops counting through a pause and needs a fresh onset after it', () => {
    const { counter, feed } = createHarness()

    feed(SINGING, 1000)
    const beforePause = counter.clearMs
    feed({ ...SINGING, clarity: 0 }, 1000)
    expect(counter.clearMs).toBe(beforePause)

    feed(SINGING, FRAME_MS * 2)
    expect(counter.clearMs).toBe(beforePause)
  })

  test('caps a long gap between frames', () => {
    const { counter, feed, skip } = createHarness()

    feed(SINGING, 500)
    const beforeGap = counter.clearMs
    skip(5000)
    feed(SINGING, FRAME_MS)

    expect(counter.clearMs - beforeGap).toBeLessThanOrEqual(100)
  })

  test('starts again from zero after a reset', () => {
    const { counter, feed } = createHarness()

    feed(SINGING, 1000)
    counter.reset()

    expect(counter.clearMs).toBe(0)
  })
})

describe('displaySeconds', () => {
  const targetSeconds = MIN_RATED_VOICED_MS / 1000

  test('reaches the rating minimum exactly at the live ready time', () => {
    expect(displaySeconds(LIVE_READY_MS - 1)).toBe(targetSeconds - 1)
    expect(displaySeconds(LIVE_READY_MS)).toBe(targetSeconds)
  })

  test('never goes past the rating minimum', () => {
    expect(displaySeconds(LIVE_READY_MS * 3)).toBe(targetSeconds)
  })

  test('starts at zero', () => {
    expect(displaySeconds(0)).toBe(0)
  })
})
