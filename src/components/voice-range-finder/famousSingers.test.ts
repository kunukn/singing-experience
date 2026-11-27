import { describe, expect, test } from 'vitest'
import { VOICE_TYPES } from '@/utils/voiceRangeSegments'
import { FAMOUS_SINGERS } from './famousSingers'

/* The comparison chart runs from the bottom of the lowest voice type to the
 * top of the highest (VOICE_TYPES is sorted low first). */
const CHART_MIN_MIDI = VOICE_TYPES[0]!.range.midiMin
const CHART_MAX_MIDI = VOICE_TYPES.at(-1)!.range.midiMax

describe('famousSingers', () => {
  test('keeps every range inside the voice types, so the chart axis never rescales', () => {
    for (const singer of FAMOUS_SINGERS) {
      expect(singer.midiMin).toBeGreaterThanOrEqual(CHART_MIN_MIDI)
      expect(singer.midiMax).toBeLessThanOrEqual(CHART_MAX_MIDI)
      expect(singer.midiMax).toBeGreaterThan(singer.midiMin)
    }
  })

  test('spans the whole chart, from its lowest note to its highest', () => {
    expect(Math.min(...FAMOUS_SINGERS.map(({ midiMin }) => midiMin))).toBe(
      CHART_MIN_MIDI,
    )
    expect(Math.max(...FAMOUS_SINGERS.map(({ midiMax }) => midiMax))).toBe(
      CHART_MAX_MIDI,
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
