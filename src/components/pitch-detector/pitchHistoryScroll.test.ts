import { describe, expect, test } from 'vitest'

import {
  getScrollThumb,
  offsetMsToScrollLeft,
  scrollLeftToOffsetMs,
} from './pitchHistoryScroll'

/* 0.1 px/ms = a 500 px plot for the 5 s window; 3 s of history beyond it */
const ltr = { pxPerMs: 0.1, scrollableMs: 3000, isRtl: false }
const rtl = { ...ltr, isRtl: true }

describe('pitchHistoryScroll', () => {
  test('puts the newest view at the far end in LTR', () => {
    expect(offsetMsToScrollLeft(0, ltr)).toBe(300)
    expect(scrollLeftToOffsetMs(300, ltr)).toBe(0)
  })

  test('puts the newest view at scrollLeft 0 in RTL', () => {
    expect(offsetMsToScrollLeft(0, rtl)).toBe(0)
    expect(scrollLeftToOffsetMs(0, rtl)).toBe(0)
  })

  test.each([
    { geometry: ltr, scrollLeft: 0, offsetMs: 3000 },
    { geometry: ltr, scrollLeft: 100, offsetMs: 2000 },
    { geometry: rtl, scrollLeft: 300, offsetMs: 3000 },
    { geometry: rtl, scrollLeft: 100, offsetMs: 1000 },
  ])(
    'round-trips scrollLeft $scrollLeft to $offsetMs ms back',
    ({ geometry, scrollLeft, offsetMs }) => {
      expect(scrollLeftToOffsetMs(scrollLeft, geometry)).toBeCloseTo(offsetMs)
      expect(offsetMsToScrollLeft(offsetMs, geometry)).toBeCloseTo(scrollLeft)
    },
  )

  test('clamps rubber-band overscroll to the take', () => {
    expect(scrollLeftToOffsetMs(-40, ltr)).toBe(3000)
    expect(scrollLeftToOffsetMs(340, ltr)).toBe(0)
    expect(scrollLeftToOffsetMs(-40, rtl)).toBe(0)
  })

  test('returns no offset before the scale is known', () => {
    expect(scrollLeftToOffsetMs(120, { ...ltr, pxPerMs: 0 })).toBe(0)
  })

  test('sizes the thumb to the visible share of the take', () => {
    /* 5 s visible of 8 s total */
    expect(getScrollThumb(0, 3000)?.sizeFraction).toBeCloseTo(5 / 8)
  })

  test('moves the thumb from the oldest edge to the newest', () => {
    expect(getScrollThumb(3000, 3000)?.startFraction).toBe(0)
    expect(getScrollThumb(0, 3000)?.startFraction).toBeCloseTo(3 / 8)
  })

  test('hides the thumb when there is nothing to scroll', () => {
    expect(getScrollThumb(0, 0)).toBeNull()
  })
})
