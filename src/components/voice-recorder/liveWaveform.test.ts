import { describe, expect, test } from 'vitest'

import {
  createNoSoundWatch,
  findRisingZeroCrossing,
  isSoundLevel,
  shapeSampleForDisplay,
} from './liveWaveform'

const QUIET_ROOM_RMS = 0.0005
const SINGING_RMS = 0.05

describe('liveWaveform', () => {
  test('finds the first rising zero crossing', () => {
    expect(findRisingZeroCrossing([0.5, -0.2, -0.1, 0.3, 0.4], 4)).toBe(3)
  })

  test('starts at 0 when nothing crosses, as in silence', () => {
    expect(findRisingZeroCrossing([0, 0, 0, 0], 3)).toBe(0)
    expect(findRisingZeroCrossing([-0.1, -0.2, 0.1], 1)).toBe(0)
  })

  test('lifts quiet singing and keeps loud singing in range', () => {
    expect(shapeSampleForDisplay(0)).toBe(0)
    expect(shapeSampleForDisplay(0.05)).toBeGreaterThan(0.25)
    expect(shapeSampleForDisplay(1)).toBeLessThanOrEqual(1)
    expect(shapeSampleForDisplay(-1)).toBeGreaterThanOrEqual(-1)
  })

  test('tells a voice from a quiet room', () => {
    expect(isSoundLevel(SINGING_RMS)).toBe(true)
    expect(isSoundLevel(QUIET_ROOM_RMS)).toBe(false)
  })
})

describe('createNoSoundWatch', () => {
  test('stays quiet while the singer gets ready', () => {
    const watch = createNoSoundWatch(1000)

    expect(watch.update(QUIET_ROOM_RMS, 3500)).toBe(false)
  })

  test('raises the hint when no sound arrives in time', () => {
    const watch = createNoSoundWatch(1000)

    expect(watch.update(QUIET_ROOM_RMS, 4000)).toBe(true)
  })

  test('drops the hint as soon as sound arrives', () => {
    const watch = createNoSoundWatch(1000)

    watch.update(QUIET_ROOM_RMS, 4000)

    expect(watch.update(SINGING_RMS, 4100)).toBe(false)
  })

  test('never raises it for a pause after singing has started', () => {
    const watch = createNoSoundWatch(1000)

    watch.update(SINGING_RMS, 1500)

    expect(watch.update(QUIET_ROOM_RMS, 60_000)).toBe(false)
  })
})
