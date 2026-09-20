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
    /* voiceRanges.bassToBaritone — C2–C4 cuts Baritone's A2–A4 short */
    const baritone = segmentFor('voiceRanges.baritone', 36, 60)

    expect(baritone?.midiFrom).toBe(45)
    expect(baritone?.midiTo).toBe(60)
    expect(baritone?.isClippedLow).toBe(false)
    expect(baritone?.isClippedHigh).toBe(true)
  })

  test('drops a voice type that only touches the range at one note', () => {
    /* Soprano starts at C4/60, exactly where bassToBaritone ends */
    const segments = getVoiceTypeSegments(36, 60)

    expect(
      segments.some((segment) => segment.labelKey === 'voiceRanges.soprano'),
    ).toBe(false)
  })

  test('keeps only the two voices a Bass–Baritone range is about', () => {
    /* C2–C4 reaches into all of Bass, Baritone, Tenor, Alto and Mezzo, but the
     * upper three barely — Tenor lands on half, Mezzo on an eighth. */
    const segments = getVoiceTypeSegments(36, 60)

    expect(segments.map((segment) => segment.labelKey)).toEqual([
      'voiceRanges.bass',
      'voiceRanges.baritone',
    ])
  })

  test('keeps a ribbon for a range narrower than any voice type', () => {
    /* The default range, Everyone G3–G4, spans 12 semitones while every voice
     * type spans 24 — so no voice can ever have half of itself on screen.
     * Judging coverage by the voice's own span alone would leave this empty. */
    const segments = getVoiceTypeSegments(55, 67)

    expect(segments.length).toBeGreaterThan(0)
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
    /* A high range: Alto becomes the first column, but it keeps ramp stop 3 so
     * its colour does not shift down to Bass's burgundy. */
    const segments = getVoiceTypeSegments(65, 84)

    expect(segments.map((segment) => segment.lane)).toEqual([0, 1, 2])
    expect(segments[0].labelKey).toBe('voiceRanges.alto')
    expect(segments[0].stopIndex).toBe(3)
  })

  test('returns nothing for a range below every voice type', () => {
    expect(getVoiceTypeSegments(12, 24)).toEqual([])
  })

  test('finds the neighbouring voices inside a single-voice range', () => {
    /* Mezzo-Soprano A3–A5 overlaps all six, but Bass and Baritone only reach
     * a third and a half of the way in, so the ribbon keeps the four that
     * genuinely sit around the singer. */
    const segments = getVoiceTypeSegments(57, 81)

    expect(segments.map((segment) => segment.labelKey)).toEqual([
      'voiceRanges.tenor',
      'voiceRanges.alto',
      'voiceRanges.mezzoSoprano',
      'voiceRanges.soprano',
    ])

    const tenor = segmentFor('voiceRanges.tenor', 57, 81)
    expect(tenor?.midiFrom).toBe(57)
    expect(tenor?.midiTo).toBe(72)
    expect(tenor?.isClippedLow).toBe(true)
    expect(tenor?.isClippedHigh).toBe(false)

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

describe('getRibbonWidth', () => {
  test('is zero when there is nothing to draw', () => {
    expect(getRibbonWidth(0)).toBe(0)
  })

  test('grows with each visible voice type', () => {
    expect(getRibbonWidth(6)).toBeGreaterThan(getRibbonWidth(3))
  })
})
