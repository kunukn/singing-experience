import { VOICE_RANGES } from '@/constants/voiceRanges'

/*
 * One classical voice type as it appears inside a wider selected range —
 * clamped to what the chart actually shows, so a caller can draw it without
 * repeating the overlap maths.
 */
export type VoiceTypeSegment = {
  /* Index into VOICE_RANGES, so a click can select this voice type. */
  rangeIndex: number
  labelKey: string
  /* Clamped to the selected range. */
  midiFrom: number
  midiTo: number
  /* The voice type reaches past what the chart shows, so that end is an edge
   * of the view rather than the voice's real boundary. */
  isClippedLow: boolean
  isClippedHigh: boolean
  /* Column position among the visible segments, 0 = lowest voice. */
  lane: number
  /* Position among all six voice types, low to high — the identity that picks
   * the colour, so Bass stays burgundy whichever other voices are on screen. */
  stopIndex: number
  /* 0–1, how much of this voice the selected range covers — the number the
   * MIN_VOICE_COVERAGE test is made of. Null for a range that names its own
   * voices: nothing measured them, so there is no figure to report. */
  coverage: number | null
}

/* px — the coloured bar and the full column it sits in. The column is wider so
 * neighbouring bars keep a gap without leaving dead space between click
 * targets. Exported because the chart has to widen its label gutter before it
 * renders the ribbon. */
export const RIBBON_BAR_WIDTH = 3
export const RIBBON_LANE_WIDTH = 5
/* px between the last column and the chart's vertical axis line. */
export const RIBBON_AXIS_GAP = 6
/*
 * Dimmed enough to read as background structure: the pitch trace carries the
 * information, and it has to stay the loudest thing on the chart. Shared with
 * the legend, so a bar and its key row never dim differently.
 */
export const RIBBON_BAR_OPACITY = 0.55

/*
 * How much of a voice type has to be on screen before it earns a bar. Without
 * it, picking Low voices (C2–C4) still paints Mezzo-Soprano off an eighth of
 * its A3–A5 span, burying the voices that range is really about. Set high
 * enough that a neighbour has to genuinely share the singer's territory:
 * three quarters of a voice type is 18 of its 24 semitones. Only consulted for
 * ranges that do not name their own voices — see focusVoices in
 * constants/voiceRanges.ts.
 */
export const MIN_VOICE_COVERAGE = 0.75

/* Ascending by pitch, so stopIndex 0 is Bass and 5 is Soprano. */
const VOICE_TYPES = VOICE_RANGES.map((range, rangeIndex) => ({
  range,
  rangeIndex,
}))
  .filter(({ range }) => range.group === 'voiceTypes')
  .sort((a, b) => a.range.midiMin - b.range.midiMin)

/*
 * Every voice type that is a real part of [midiMin, midiMax]. A type touching
 * the range at a single note is dropped — Soprano starts exactly where the
 * Low voices range ends, and a zero-height bar says nothing.
 *
 * What counts as "real" depends on the range. One named after voices passes
 * focusVoices and gets exactly those; any other range falls back to how much
 * of each voice is on screen, per MIN_VOICE_COVERAGE.
 */
export function getVoiceTypeSegments(
  midiMin: number,
  midiMax: number,
  focusVoices?: readonly string[],
): VoiceTypeSegment[] {
  const segments: VoiceTypeSegment[] = []
  const chartSpan = midiMax - midiMin

  VOICE_TYPES.forEach(({ range, rangeIndex }, stopIndex) => {
    const midiFrom = Math.max(range.midiMin, midiMin)
    const midiTo = Math.min(range.midiMax, midiMax)
    if (midiTo <= midiFrom) return

    /*
     * Measured against the smaller of the two spans, so it reads as "most of
     * the voice is on screen, or the voice covers most of what is on screen".
     * Dividing by the voice's own span alone would empty the ribbon for every
     * range narrower than a voice type — all six are 24 semitones, so against
     * the default Everyone (G3–G4) none of them could clear even half.
     */
    const coverage =
      (midiTo - midiFrom) / Math.min(range.midiMax - range.midiMin, chartSpan)

    if (focusVoices) {
      if (!focusVoices.includes(range.labelKey)) return
    } else if (coverage < MIN_VOICE_COVERAGE) return

    segments.push({
      rangeIndex,
      labelKey: range.labelKey,
      midiFrom,
      midiTo,
      isClippedLow: range.midiMin < midiMin,
      isClippedHigh: range.midiMax > midiMax,
      lane: segments.length,
      stopIndex,
      coverage: focusVoices ? null : coverage,
    })
  })

  return segments
}

/*
 * Segments for the selected range — the same as getVoiceTypeSegments, but it
 * picks up whatever voices that range names. Both the ribbon and the chart that
 * sizes its gutter go through here, so the two can never disagree on how many
 * bars there are.
 */
export function getSegmentsForRange(
  rangeIndex: number,
  midiMin: number,
  midiMax: number,
): VoiceTypeSegment[] {
  return getVoiceTypeSegments(
    midiMin,
    midiMax,
    VOICE_RANGES[rangeIndex]?.focusVoices,
  )
}

/* Width the ribbon needs, including the gap before the axis line. */
export function getRibbonWidth(segmentCount: number): number {
  if (segmentCount === 0) return 0

  return segmentCount * RIBBON_LANE_WIDTH + RIBBON_AXIS_GAP
}
