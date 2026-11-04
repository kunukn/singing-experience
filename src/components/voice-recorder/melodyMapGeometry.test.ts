import { describe, expect, test } from 'vitest'

import {
  contentWidthFor,
  contentXToTime,
  pitchRangeFor,
  pitchRangeForTake,
  scrollLeftToReveal,
  startScrollLeft,
  timeToContentX,
  timeTickStepMs,
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

  test.each([
    { durationMs: 4000, contentWidth: 730, expected: 1000 },
    { durationMs: 60_000, contentWidth: 3600, expected: 2000 },
    { durationMs: 1000, contentWidth: 730, expected: 1000 },
  ])(
    'labels a $durationMs ms take every $expected ms',
    ({ durationMs, contentWidth, expected }) => {
      expect(timeTickStepMs({ durationMs, contentWidth, isRtl: false })).toBe(
        expected,
      )
    },
  )

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

  test('widens the range for a slide that runs past the notes', () => {
    const notes = [60, 72]
    const lineFallingBelowTheNotes = Float32Array.from(
      { length: 100 },
      (_, i) => (i < 80 ? 66 : 50),
    )

    expect(pitchRangeForTake(notes, lineFallingBelowTheNotes).midiMin).toBe(48)
  })

  test('ignores a single wild reading', () => {
    const notes = [60, 72]
    const steadyLine = new Float32Array(1000).fill(66)
    steadyLine[500] = 20

    expect(pitchRangeForTake(notes, steadyLine)).toEqual(pitchRangeFor(notes))
  })

  test('uses the notes alone when nothing was voiced', () => {
    const silence = new Float32Array(10).fill(Number.NaN)

    expect(pitchRangeForTake([60, 72], silence)).toEqual(
      pitchRangeFor([60, 72]),
    )
  })

  test('keeps at least an octave of pitch on screen', () => {
    expect(pitchRangeFor([60])).toEqual({ midiMin: 54, midiMax: 66 })
  })

  test('pads a wide melody without forcing extra room', () => {
    expect(pitchRangeFor([48, 72])).toEqual({ midiMin: 46, midiMax: 74 })
  })
})
