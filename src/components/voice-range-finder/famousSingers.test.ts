import { describe, expect, test } from 'vitest'
import { FAMOUS_SINGERS } from './famousSingers'

const E2_MIDI = 40
const C6_MIDI = 84

describe('famousSingers', () => {
  test('keeps every range inside E2–C6, so the chart axis never rescales', () => {
    for (const singer of FAMOUS_SINGERS) {
      expect(singer.midiMin).toBeGreaterThanOrEqual(E2_MIDI)
      expect(singer.midiMax).toBeLessThanOrEqual(C6_MIDI)
      expect(singer.midiMax).toBeGreaterThan(singer.midiMin)
    }
  })

  test('spans the whole chart, from E2 to C6', () => {
    expect(Math.min(...FAMOUS_SINGERS.map(({ midiMin }) => midiMin))).toBe(
      E2_MIDI,
    )
    expect(Math.max(...FAMOUS_SINGERS.map(({ midiMax }) => midiMax))).toBe(
      C6_MIDI,
    )
  })

  test('lists singers high to low by midpoint', () => {
    const midpoints = FAMOUS_SINGERS.map(
      ({ midiMin, midiMax }) => (midiMin + midiMax) / 2,
    )

    expect(midpoints).toEqual(midpoints.toSorted((a, b) => b - a))
  })

  test('gives every singer a unique id', () => {
    const ids = FAMOUS_SINGERS.map(({ id }) => id)

    expect(new Set(ids).size).toBe(ids.length)
  })
})
