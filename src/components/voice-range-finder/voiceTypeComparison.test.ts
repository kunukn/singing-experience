import { describe, expect, test } from 'vitest'
import { compareWithVoiceTypes } from './voiceTypeComparison'

/* G♯2–C4, the range from the report that prompted this comparison */
const G_SHARP_2 = 44
const C4 = 60

const rowFor = (
  rows: ReturnType<typeof compareWithVoiceTypes>,
  labelKey: string,
) => rows.find((row) => row.labelKey === labelKey)!

describe('compareWithVoiceTypes', () => {
  test('lists the six voice types high to low', () => {
    const rows = compareWithVoiceTypes(G_SHARP_2, C4)

    expect(rows.map((row) => row.labelKey)).toEqual([
      'voiceRanges.soprano',
      'voiceRanges.mezzoSoprano',
      'voiceRanges.alto',
      'voiceRanges.tenor',
      'voiceRanges.baritone',
      'voiceRanges.bass',
    ])
  })

  test('measures coverage against the voice, not the range', () => {
    const baritone = rowFor(
      compareWithVoiceTypes(G_SHARP_2, C4),
      'voiceRanges.baritone',
    )

    /* A2–C4 of A2–A4: 15 of 24 semitones */
    expect(baritone.coverage).toBeCloseTo(15 / 24)
    expect(baritone.covered).toEqual({ midiMin: 45, midiMax: 60 })
  })

  test('points up when only the top of the voice is missing', () => {
    const baritone = rowFor(
      compareWithVoiceTypes(G_SHARP_2, C4),
      'voiceRanges.baritone',
    )

    expect(baritone.reachDownTo).toBe(null)
    expect(baritone.reachUpTo).toBe(69) // A4
  })

  test('points both ways when the range sits inside the voice', () => {
    const bass = rowFor(
      compareWithVoiceTypes(G_SHARP_2, C4),
      'voiceRanges.bass',
    )

    expect(bass.reachDownTo).toBe(40) // E2
    expect(bass.reachUpTo).toBe(64) // E4
  })

  test('reports a voice the range never touches as uncovered', () => {
    const soprano = rowFor(
      compareWithVoiceTypes(G_SHARP_2, C4),
      'voiceRanges.soprano',
    )

    expect(soprano.coverage).toBe(0)
    expect(soprano.covered).toBe(null)
    expect(soprano.reachUpTo).toBe(84) // C6
  })

  test('leaves no direction for a voice covered whole', () => {
    const baritone = rowFor(
      compareWithVoiceTypes(45, 69),
      'voiceRanges.baritone',
    )

    expect(baritone.coverage).toBe(1)
    expect(baritone.reachDownTo).toBe(null)
    expect(baritone.reachUpTo).toBe(null)
  })

  test('marks the voice with the most coverage as the best fit', () => {
    const rows = compareWithVoiceTypes(G_SHARP_2, C4)

    expect(
      rows.filter((row) => row.isBestFit).map((row) => row.labelKey),
    ).toEqual(['voiceRanges.bass'])
  })

  test('breaks a coverage tie by the nearest midpoint', () => {
    /* C2–C7 covers every voice whole; its midpoint (F♯4) is nearest Alto's (F4) */
    const rows = compareWithVoiceTypes(36, 96)

    expect(rows.find((row) => row.isBestFit)?.labelKey).toBe('voiceRanges.alto')
  })
})
