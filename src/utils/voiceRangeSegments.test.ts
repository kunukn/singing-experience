import { describe, expect, test } from 'vitest'
import { getRibbonWidth, getVoiceTypeSegments } from './voiceRangeSegments'

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
    /* voiceRanges.bassToBaritone — C2–C4 cuts Tenor's C3–C5 in half */
    const tenor = segmentFor('voiceRanges.tenor', 36, 60)

    expect(tenor?.midiFrom).toBe(48)
    expect(tenor?.midiTo).toBe(60)
    expect(tenor?.isClippedLow).toBe(false)
    expect(tenor?.isClippedHigh).toBe(true)
  })

  test('drops a voice type that only touches the range at one note', () => {
    /* Soprano starts at C4/60, exactly where bassToBaritone ends */
    const segments = getVoiceTypeSegments(36, 60)

    expect(
      segments.some((segment) => segment.labelKey === 'voiceRanges.soprano'),
    ).toBe(false)
    expect(segments).toHaveLength(5)
  })

  test('clips a voice type at both ends when the range sits inside it', () => {
    /* voiceRanges.tenorToSoprano — C3–C6 starts above Bass's E2 and ends above
     * its E4, so Bass survives as a clipped sliver rather than dropping out. */
    const bass = segmentFor('voiceRanges.bass', 48, 84)

    expect(bass?.midiFrom).toBe(48)
    expect(bass?.midiTo).toBe(64)
    expect(bass?.isClippedLow).toBe(true)
    expect(bass?.isClippedHigh).toBe(false)
  })

  test('numbers lanes consecutively while colours stay tied to the voice', () => {
    /* A range above Bass's ceiling: Baritone becomes the first column, but it
     * keeps ramp stop 1 so its colour does not shift to Bass's burgundy. */
    const segments = getVoiceTypeSegments(65, 84)

    expect(segments.map((segment) => segment.lane)).toEqual([0, 1, 2, 3, 4])
    expect(segments[0].labelKey).toBe('voiceRanges.baritone')
    expect(segments[0].stopIndex).toBe(1)
  })

  test('returns nothing for a range below every voice type', () => {
    expect(getVoiceTypeSegments(12, 24)).toEqual([])
  })

  test('still finds every voice type inside a single-voice range', () => {
    /* Mezzo-Soprano A3–A5 is one voice type, but all six overlap it somewhere,
     * which is what lets the ribbon show where a singer sits against them. */
    const segments = getVoiceTypeSegments(57, 81)

    expect(segments).toHaveLength(6)

    const bass = segmentFor('voiceRanges.bass', 57, 81)
    expect(bass?.midiFrom).toBe(57)
    expect(bass?.midiTo).toBe(64)
    expect(bass?.isClippedLow).toBe(true)
    expect(bass?.isClippedHigh).toBe(false)

    const mezzo = segmentFor('voiceRanges.mezzoSoprano', 57, 81)
    expect(mezzo?.isClippedLow).toBe(false)
    expect(mezzo?.isClippedHigh).toBe(false)
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
