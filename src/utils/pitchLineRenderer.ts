/* Shared renderer for the "singer pitch line / preview indicator" — the dashed
 * horizontal line + dot + note label drawn at the sung/preview pitch.
 *
 * Tier A (PitchHistoryCanvas, SingToneChart, WarmUpChart) call drawPitchLine
 * for the whole thing. Tier B/C (PitchGamePitchHistoryCanvas, SingFlyCanvas)
 * import only the primitives for value-level sharing and keep their own
 * bespoke draw orchestration — see docs/plan for why a single function would
 * become a config monster. */

import { OUT_OF_RANGE_OVERFLOW_PX } from '@/constants/chartStyles'
import {
  formatNoteLabelWithCents,
  frequencyToMidi,
  midiToNoteLabel,
} from '@/utils/noteUtils'

/* The one place to change the pitch line's stroke/dot geometry. Consumed by
 * every Tier-A chart; Tier B/C intentionally keep their own (different) values. */
export const PITCH_LINE_STYLE = {
  lineWidth: 3,
  dash: [4, 4] as const,
  dotRadius: 5,
} as const

/* Default chart paddings shared by the Tier-A charts (all use 16/16). */
const DEFAULT_PADDING_TOP = 16
const DEFAULT_PADDING_BOTTOM = 16

/* px between the dot edge and the label glyph (dotRadius + this). */
const LABEL_GAP_PX = 6

/* The single shared pitch-line palette, verified identical across Tier A:
 * green line 0.3 / red|orange line 0.25, dot 0.8 (correct) | 0.7, label
 * 0.9 (correct) | 0.8. rgba literals (not --p-* vars) because each element
 * carries its own alpha — matches the existing canvas convention. */
const COLORS = {
  correct: {
    line: 'rgba(74, 222, 128, 0.3)',
    dot: 'rgba(74, 222, 128, 0.8)',
    label: 'rgba(74, 222, 128, 0.9)',
  },
  outOfRange: {
    line: 'rgba(239, 68, 68, 0.25)',
    dot: 'rgba(239, 68, 68, 0.7)',
    label: 'rgba(239, 68, 68, 0.8)',
  },
  inRange: {
    line: 'rgba(251, 146, 60, 0.25)',
    dot: 'rgba(251, 146, 60, 0.7)',
    label: 'rgba(251, 146, 60, 0.8)',
  },
  /* The second singer in duet mode. Two dashed lines in the same colour are
   * impossible to tell apart, so the high voice gets its own hue — the same
   * blue (--p-blue-400, #60a5fa) the piano and guitar boards give their high
   * lane. Alphas mirror inRange, which it stands in for. */
  highLane: {
    line: 'rgba(96, 165, 250, 0.25)',
    dot: 'rgba(96, 165, 250, 0.7)',
    label: 'rgba(96, 165, 250, 0.8)',
  },
} as const

/**
 * Fractional MIDI from Hz for sub-semitone Y positioning; integer-MIDI
 * fallback when no usable frequency. Same math as frequencyToMidi
 * (12·log₂(f/440)+69) — reused so every chart agrees on the mapping.
 */
export function resolveEffectiveMidi(
  midi: number,
  frequency?: number | null,
): number {
  if (frequency != null && frequency > 0) return frequencyToMidi(frequency)

  return midi
}

/**
 * Out-of-range = the raw Y falls outside the chart's padded band. The clamped
 * Y is pulled back to that band plus OUT_OF_RANGE_OVERFLOW_PX so an
 * out-of-range pitch still pokes slightly past the edge as a visual cue.
 */
export function clampPitchY(
  y: number,
  height: number,
  paddingTop: number = DEFAULT_PADDING_TOP,
  paddingBottom: number = DEFAULT_PADDING_BOTTOM,
): { clampedY: number; isOutOfRange: boolean } {
  const isOutOfRange = y < paddingTop || y > height - paddingBottom
  const clampedY = Math.max(
    paddingTop - OUT_OF_RANGE_OVERFLOW_PX,
    Math.min(height - paddingBottom + OUT_OF_RANGE_OVERFLOW_PX, y),
  )

  return { clampedY, isOutOfRange }
}

/**
 * The shared line/dot/label color triple. `isCorrect` (singer on target) wins
 * over `isOutOfRange`, matching the existing Tier-A ternaries.
 *
 * `isHighLane` is checked last, so it only replaces the ordinary in-range
 * orange: on target or off the chart still reads green or red whichever singer
 * produced it — those two say something about the pitch, not about who sang it.
 */
export function pitchLineColors(state: {
  isOutOfRange: boolean
  isCorrect?: boolean
  isHighLane?: boolean
}): { line: string; dot: string; label: string } {
  if (state.isCorrect) return COLORS.correct
  if (state.isOutOfRange) return COLORS.outOfRange
  if (state.isHighLane) return COLORS.highLane

  return COLORS.inRange
}

type DrawPitchLineOptions = {
  /* Integer note used for the label (and the cents reference). */
  midi: number
  frequency: number | null
  height: number
  /* Each chart keeps its own MIDI→Y mapping; pass it as a closure. */
  midiToY: (midi: number) => number
  /* Horizontal extent of the dashed line (chartLeft → chartRight). */
  lineX0: number
  lineX1: number
  /* Dot + label anchor X. */
  dotX: number
  isCorrect?: boolean
  /* Draw this line as the duet high voice (blue) rather than the low/only one
   * (orange). See pitchLineColors. */
  isHighLane?: boolean
  /* Draw the note label at all. PitchHistory passes false when it has no
   * resolved preview label (matching its old `if (previewNoteLabel)` guard). */
  showLabel?: boolean
  /* Draw the dot at the anchor X. PitchHistory passes false while listening so
   * the dashed reference line stays but the redundant center dot is hidden. */
  showDot?: boolean
  hideLabelWhenCorrect?: boolean
  /* null → no cents suffix (SingTone). A number → append "±N¢" when the sung
   * pitch deviates more than this many cents (PitchHistory 20, WarmUp 30). */
  centsThreshold?: number | null
  isRtl?: boolean
  /* Optional pre-resolved label string. Defaults to midiToNoteLabel(midi).
   * PitchHistory passes its own previewNoteLabel to preserve exact behavior. */
  noteLabel?: string | null
  paddingTop?: number
  paddingBottom?: number
}

/**
 * The consolidated Tier-A pitch indicator: dashed horizontal line + dot +
 * (optionally cents-annotated) note label. Caller owns the visibility guard
 * (preview/replay/listening state) — this only draws.
 */
export function drawPitchLine(
  ctx: CanvasRenderingContext2D,
  options: DrawPitchLineOptions,
): void {
  const {
    midi,
    frequency,
    height,
    midiToY,
    lineX0,
    lineX1,
    dotX,
    isCorrect = false,
    isHighLane = false,
    showLabel = true,
    showDot = true,
    hideLabelWhenCorrect = false,
    centsThreshold = null,
    isRtl = false,
    noteLabel = null,
    paddingTop,
    paddingBottom,
  } = options

  const effectiveMidi = resolveEffectiveMidi(midi, frequency)
  const rawY = midiToY(effectiveMidi)
  const { clampedY, isOutOfRange } = clampPitchY(
    rawY,
    height,
    paddingTop,
    paddingBottom,
  )
  const colors = pitchLineColors({ isOutOfRange, isCorrect, isHighLane })

  ctx.save()

  /* Dashed horizontal line across the chart. */
  ctx.strokeStyle = colors.line
  ctx.lineWidth = PITCH_LINE_STYLE.lineWidth
  ctx.setLineDash([...PITCH_LINE_STYLE.dash])
  ctx.beginPath()
  ctx.moveTo(lineX0, clampedY)
  ctx.lineTo(lineX1, clampedY)
  ctx.stroke()
  ctx.setLineDash([])

  /* Dot at the anchor X. */
  if (showDot) {
    ctx.beginPath()
    ctx.arc(dotX, clampedY, PITCH_LINE_STYLE.dotRadius, 0, Math.PI * 2)
    ctx.fillStyle = colors.dot
    ctx.fill()
  }

  /* Note label — hidden when on target (the target label already covers it). */
  if (showLabel && !(hideLabelWhenCorrect && isCorrect)) {
    let displayLabel = noteLabel ?? midiToNoteLabel(midi).label
    if (centsThreshold != null && !isOutOfRange && frequency != null) {
      /* 100 = cents per semitone; explains why the line sits off the named
       * note's integer-MIDI row. */
      const cents = Math.round(100 * (effectiveMidi - midi))
      displayLabel = formatNoteLabelWithCents(
        displayLabel,
        cents,
        centsThreshold,
      )
    }

    const labelOffset = PITCH_LINE_STYLE.dotRadius + LABEL_GAP_PX
    ctx.font = 'bold 13px monospace'
    ctx.fillStyle = colors.label
    ctx.textAlign = isRtl ? 'end' : 'start'
    ctx.textBaseline = 'middle'
    ctx.fillText(
      displayLabel,
      isRtl ? dotX - labelOffset : dotX + labelOffset,
      clampedY,
    )
  }

  ctx.restore()
}
