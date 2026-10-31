import { VOICE_TYPES } from '@/utils/voiceRangeSegments'

export type VoiceTypeComparisonRow = {
  labelKey: string
  /* Index into VOICE_RANGES, for adopting this voice as My range */
  rangeIndex: number
  /* 0 = Bass … 5 = Soprano, for the ribbon colour */
  stopIndex: number
  voiceMin: number
  voiceMax: number
  /* The stretch of this voice the singer reaches, or null when none of it */
  covered: { midiMin: number; midiMax: number } | null
  /* 0–1 share of the voice's own span the singer reaches */
  coverage: number
  /* The voice's low note when the singer doesn't get down to it yet */
  reachDownTo: number | null
  /* The voice's high note when the singer doesn't get up to it yet */
  reachUpTo: number | null
  isBestFit: boolean
}

/**
 * How a singer's range measures up against each voice type, high to low.
 *
 * Coverage is measured against the voice's own span, unlike the chart ribbon
 * (getVoiceTypeSegments), which divides by the smaller of the two spans to ask
 * "is this voice really on screen?". Here the question is "how much of this
 * voice can I sing, and which way is the rest?" — so G♯2–C4 covers 63% of
 * Baritone and still has to reach up to A4, rather than scoring 94% because
 * most of the range happens to sit inside Baritone.
 */
export function compareWithVoiceTypes(
  midiMin: number,
  midiMax: number,
): VoiceTypeComparisonRow[] {
  const rangeMidpoint = (midiMin + midiMax) / 2

  const rows = VOICE_TYPES.map(({ range, rangeIndex }, stopIndex) => {
    const overlapMin = Math.max(range.midiMin, midiMin)
    const overlapMax = Math.min(range.midiMax, midiMax)
    const hasOverlap = overlapMax > overlapMin

    return {
      labelKey: range.labelKey,
      rangeIndex,
      stopIndex,
      voiceMin: range.midiMin,
      voiceMax: range.midiMax,
      covered: hasOverlap ? { midiMin: overlapMin, midiMax: overlapMax } : null,
      coverage: hasOverlap
        ? (overlapMax - overlapMin) / (range.midiMax - range.midiMin)
        : 0,
      reachDownTo: range.midiMin < midiMin ? range.midiMin : null,
      reachUpTo: range.midiMax > midiMax ? range.midiMax : null,
      isBestFit: false,
      midpointDistance: Math.abs(
        (range.midiMin + range.midiMax) / 2 - rangeMidpoint,
      ),
    }
  })

  /* Most of the voice covered wins; on a tie, the voice centred nearest the
   * singer's range — the one they'd sit most comfortably in. */
  const bestFit = rows.toSorted(
    (a, b) =>
      b.coverage - a.coverage || a.midpointDistance - b.midpointDistance,
  )[0]

  /* High to low, as every vertical pitch list in the app reads */
  return rows.toReversed().map(({ midpointDistance: _, ...row }) => ({
    ...row,
    isBestFit: row.coverage > 0 && row.labelKey === bestFit?.labelKey,
  }))
}
