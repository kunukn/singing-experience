import { describe, expect, test } from 'vitest'
import { VOICE_RANGES } from '@/constants/voiceRanges'
import {
  getRibbonWidth,
  getSegmentsForRange,
  getVoiceTypeSegments,
} from './voiceRangeSegments'

function indexOfRange(labelKey: string): number {
  return VOICE_RANGES.findIndex((range) => range.labelKey === labelKey)
}

function voiceTypesForRange(labelKey: string): string[] {
  const index = indexOfRange(labelKey)
  const range = VOICE_RANGES[index]

  return getSegmentsForRange(index, range.midiMin, range.midiMax).map(
    (segment) => segment.labelKey,
  )
}

function segmentFor(labelKey: string, midiMin: number, midiMax: number) {
  return getVoiceTypeSegments(midiMin, midiMax).find(
    (segment) => segment.labelKey === labelKey,
  )
}

describe('getVoiceTypeSegments', () => {
  test('returns all six voice types for the full range', () => {
    /* voiceRanges.full — C2–C7 contains every voice type outright */
    const segments = getVoiceTypeSegments(36, 96)

    expect(segments).toHaveLength(6)
    expect(segments.map((segment) => segment.labelKey)).toEqual([
      'voiceRanges.bass',
      'voiceRanges.baritone',
      'voiceRanges.tenor',
      'voiceRanges.alto',
      'voiceRanges.mezzoSoprano',
      'voiceRanges.soprano',
    ])
    expect(
      segments.every(
        (segment) => !segment.isClippedLow && !segment.isClippedHigh,
      ),
    ).toBe(true)
  })

  test('keeps Tenor at its real boundaries inside the Choir range', () => {
    /* voiceRanges.choir — E2–C6 fully contains Tenor's C3–C5 */
    const tenor = segmentFor('voiceRanges.tenor', 40, 84)

    expect(tenor).toBeDefined()
    expect(tenor?.midiFrom).toBe(48)
    expect(tenor?.midiTo).toBe(72)
    expect(tenor?.isClippedLow).toBe(false)
    expect(tenor?.isClippedHigh).toBe(false)
  })

  test('clamps and flags a voice type that overflows the range', () => {
    /* voiceRanges.lowVoices — C2–C4 cuts Bass's E2–E4 short */
    const bass = segmentFor('voiceRanges.bass', 36, 60)

    expect(bass?.midiFrom).toBe(40)
    expect(bass?.midiTo).toBe(60)
    expect(bass?.isClippedLow).toBe(false)
    expect(bass?.isClippedHigh).toBe(true)
  })

  test('drops a voice type that only touches the range at one note', () => {
    /* Soprano starts at C4/60, exactly where lowVoices ends */
    const segments = getVoiceTypeSegments(36, 60)

    expect(
      segments.some((segment) => segment.labelKey === 'voiceRanges.soprano'),
    ).toBe(false)
  })

  test('keeps only the voice a Low voices range is about', () => {
    /* C2–C4 reaches into Bass, Baritone, Tenor, Alto and Mezzo, but only Bass
     * has three quarters of itself on screen — Baritone lands on five eighths,
     * Tenor on half, Mezzo on an eighth. */
    const segments = getVoiceTypeSegments(36, 60)

    expect(segments.map((segment) => segment.labelKey)).toEqual([
      'voiceRanges.bass',
    ])
  })

  test('keeps a ribbon for a range narrower than any voice type', () => {
    /* The default range, Everyone G3–G4, spans 12 semitones while every voice
     * type spans 24 — so no voice can ever have half of itself on screen.
     * Judging coverage by the voice's own span alone would leave this empty. */
    const segments = getVoiceTypeSegments(55, 67)

    expect(segments.length).toBeGreaterThan(0)
  })

  test('clips a voice type that starts below the range', () => {
    /* C3–C6 starts above Baritone's A2, so on the coverage path Baritone
     * survives with its floor cut off rather than dropping out. */
    const baritone = segmentFor('voiceRanges.baritone', 48, 84)

    expect(baritone?.midiFrom).toBe(48)
    expect(baritone?.midiTo).toBe(69)
    expect(baritone?.isClippedLow).toBe(true)
    expect(baritone?.isClippedHigh).toBe(false)
  })

  test('numbers lanes consecutively while colours stay tied to the voice', () => {
    /* A high range: Mezzo-Soprano becomes the first column, but it keeps ramp
     * stop 4 so its colour does not shift down to Bass's burgundy. */
    const segments = getVoiceTypeSegments(65, 84)

    expect(segments.map((segment) => segment.lane)).toEqual([0, 1])
    expect(segments[0].labelKey).toBe('voiceRanges.mezzoSoprano')
    expect(segments[0].stopIndex).toBe(4)
  })

  test('reports how much of each voice the range covers', () => {
    /* Comfy – Women C4–C5 is 12 semitones, so coverage measures how much of
     * that window each voice fills: Soprano spans all of it, Baritone stops at
     * A4 and lands on exactly the 0.75 minimum, which `<` lets through. */
    expect(segmentFor('voiceRanges.soprano', 60, 72)?.coverage).toBe(1)
    expect(segmentFor('voiceRanges.baritone', 60, 72)?.coverage).toBe(0.75)
    expect(segmentFor('voiceRanges.tenor', 45, 69)?.coverage).toBeCloseTo(0.875)
  })

  test('reports no coverage for a range that names its own voices', () => {
    /* Nothing measured these voices, so there is no figure to report. */
    const index = indexOfRange('voiceRanges.tenorToSoprano')
    const segments = getSegmentsForRange(index, 48, 84)

    expect(segments.map((segment) => segment.coverage)).toEqual([null, null])
  })

  test('returns nothing for a range below every voice type', () => {
    expect(getVoiceTypeSegments(12, 24)).toEqual([])
  })

  test('finds the neighbouring voices inside a single-voice range', () => {
    /* Mezzo-Soprano A3–A5 overlaps all six, but Bass, Baritone and Tenor only
     * reach a third, a half and five eighths of the way in, so the ribbon
     * keeps the three that genuinely sit around the singer. */
    const segments = getVoiceTypeSegments(57, 81)

    expect(segments.map((segment) => segment.labelKey)).toEqual([
      'voiceRanges.alto',
      'voiceRanges.mezzoSoprano',
      'voiceRanges.soprano',
    ])

    const alto = segmentFor('voiceRanges.alto', 57, 81)
    expect(alto?.midiFrom).toBe(57)
    expect(alto?.midiTo).toBe(77)
    expect(alto?.isClippedLow).toBe(true)
    expect(alto?.isClippedHigh).toBe(false)

    const mezzo = segmentFor('voiceRanges.mezzoSoprano', 57, 81)
    expect(mezzo?.isClippedLow).toBe(false)
    expect(mezzo?.isClippedHigh).toBe(false)
  })

  test.each([
    { labelKey: 'voiceRanges.bass', midiMin: 40, midiMax: 64 },
    { labelKey: 'voiceRanges.baritone', midiMin: 45, midiMax: 69 },
    { labelKey: 'voiceRanges.tenor', midiMin: 48, midiMax: 72 },
    { labelKey: 'voiceRanges.alto', midiMin: 53, midiMax: 77 },
    { labelKey: 'voiceRanges.mezzoSoprano', midiMin: 57, midiMax: 81 },
    { labelKey: 'voiceRanges.soprano', midiMin: 60, midiMax: 84 },
  ])(
    'never filters out $labelKey when it is the chosen range',
    ({ labelKey, midiMin, midiMax }) => {
      expect(segmentFor(labelKey, midiMin, midiMax)).toBeDefined()
    },
  )
})

describe('getSegmentsForRange', () => {
  test('shows only the voices a focused range names', () => {
    /* Both spans reach further than their names: E2–A4 covers most of Tenor
     * and two-thirds of Alto, and C3–C6 contains all six outright. */
    expect(voiceTypesForRange('voiceRanges.bassToBaritone')).toEqual([
      'voiceRanges.bass',
      'voiceRanges.baritone',
    ])
    expect(voiceTypesForRange('voiceRanges.tenorToSoprano')).toEqual([
      'voiceRanges.tenor',
      'voiceRanges.soprano',
    ])
  })

  test('falls back to coverage for a range that names no voices', () => {
    expect(voiceTypesForRange('voiceRanges.lowVoices')).toEqual([
      'voiceRanges.bass',
    ])
    expect(voiceTypesForRange('voiceRanges.highVoices')).toEqual([
      'voiceRanges.mezzoSoprano',
      'voiceRanges.soprano',
    ])
    expect(voiceTypesForRange('voiceRanges.choir')).toHaveLength(6)
    expect(voiceTypesForRange('voiceRanges.full')).toHaveLength(6)
  })

  test('still drops a named voice that does not overlap at all', () => {
    /* A focus list cannot conjure a bar out of nothing — a zero-height segment
     * would be invisible anyway, and its caps would claim boundaries the chart
     * does not show. */
    const segments = getVoiceTypeSegments(36, 44, ['voiceRanges.soprano'])

    expect(segments).toEqual([])
  })

  test('keeps lanes consecutive when a focus list skips voices', () => {
    const index = indexOfRange('voiceRanges.tenorToSoprano')
    const segments = getSegmentsForRange(index, 48, 84)

    expect(segments.map((segment) => segment.lane)).toEqual([0, 1])
    /* Colours stay tied to the voice: Tenor is ramp stop 2, Soprano stop 5 */
    expect(segments.map((segment) => segment.stopIndex)).toEqual([2, 5])
  })
})

describe('getRibbonWidth', () => {
  test('is zero when there is nothing to draw', () => {
    expect(getRibbonWidth(0)).toBe(0)
  })

  test('grows with each visible voice type', () => {
    expect(getRibbonWidth(6)).toBeGreaterThan(getRibbonWidth(3))
  })
})
