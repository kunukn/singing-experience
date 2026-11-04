import { describe, expect, test } from 'vitest'

import {
  contentWidthFor,
  contentXToTime,
  pitchRangeFor,
  scrollLeftToReveal,
  startScrollLeft,
  timeToContentX,
} from './melodyMapGeometry'

const axis = { durationMs: 10_000, contentWidth: 600, isRtl: false }
const rtlAxis = { ...axis, isRtl: true }

describe('melodyMapGeometry', () => {
  test('fills the viewport for a short take', () => {
    expect(contentWidthFor(1000, 400)).toBe(400)
  })

  test('scales with duration for a long take', () => {
    expect(contentWidthFor(60_000, 400)).toBe(3600)
  })

  test('runs time left to right in LTR', () => {
    expect(timeToContentX(0, axis)).toBe(0)
    expect(timeToContentX(10_000, axis)).toBe(600)
  })

  test('runs time right to left in RTL', () => {
    expect(timeToContentX(0, rtlAxis)).toBe(600)
    expect(timeToContentX(10_000, rtlAxis)).toBe(0)
  })

  test.each([axis, rtlAxis])('round-trips x and time', (timeAxis) => {
    const x = timeToContentX(2500, timeAxis)

    expect(contentXToTime(x, timeAxis)).toBeCloseTo(2500)
  })

  test('starts an RTL take scrolled to its far end', () => {
    expect(startScrollLeft(1000, 400, true)).toBe(600)
    expect(startScrollLeft(1000, 400, false)).toBe(0)
  })

  test('leaves the scroll alone while the playhead is on screen', () => {
    expect(scrollLeftToReveal(150, 100, 400, false)).toBeNull()
  })

  test('turns the page when the playhead leaves the screen', () => {
    expect(scrollLeftToReveal(600, 100, 400, false)).toBe(550)
    expect(scrollLeftToReveal(450, 0, 400, true)).toBe(100)
    expect(scrollLeftToReveal(50, 100, 400, true)).toBe(0)
  })

  test('keeps at least an octave of pitch on screen', () => {
    expect(pitchRangeFor([60])).toEqual({ midiMin: 54, midiMax: 66 })
  })

  test('pads a wide melody without forcing extra room', () => {
    expect(pitchRangeFor([48, 72])).toEqual({ midiMin: 46, midiMax: 74 })
  })
})
