<script setup lang="ts">
import { resolveCssColor, withAlpha } from '@/utils/cssColor'
import type { NoteInfo } from '@/utils/noteUtils'
import { midiToNoteLabel } from '@/utils/noteUtils'
import { cleanColor, cleanColorRgb } from '@/utils/pitchColors'
import {
  clampPitchY,
  pitchLineColors,
  resolveEffectiveMidi,
} from '@/utils/pitchLineRenderer'

import {
  GAME_PICKUP_LINE_RATIO,
  HISTORY_RETENTION_MS,
  HISTORY_WINDOW_MS,
  PAUSE_GAP_MS,
} from './pitchConstants'
import {
  HIT_TOLERANCE_CENTS,
  LEAD_IN_MS,
  type GameTarget,
} from './usePitchGame'

type Props = {
  noteInfo: NoteInfo | null
  isListening: boolean
  isClean: boolean
  midiMin: number
  midiMax: number
  gridMidis: number[]
  activeMidi?: number | null
  replayProgress?: number | null
  previewMidi?: number | null
  previewNoteLabel?: string | null
  previewFrequency?: number | null
  isRtl?: boolean
  targets?: GameTarget[]
  simplifyChart?: boolean
}

export type PitchSample = {
  midiNote: number
  timestamp: number
  isClean: boolean
  cents: number
}

type NoteMarker = {
  midiNote: number
  timestamp: number
  label: string
  showLabel: boolean
}

type MarkerHitArea = {
  x: number
  y: number
  w: number
  h: number
  midiNote: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  markerClick: [midiNote: number]
}>()

const LABEL_WIDTH = 40
const PADDING_TOP = 16
const PADDING_BOTTOM = 16
const PADDING_RIGHT = 16
const CHART_INSET_RIGHT = 16
/* Vertical grid line spacing — one marker every 250 ms for subtle time reference */
const TIME_MARKER_INTERVAL_MS = 250
/* How long a note must be held before a label marker appears on the chart */
const SUSTAINED_THRESHOLD_MS = 200
/* Shorter threshold after a quick note transition — feels more responsive during runs */
const SUSTAINED_PASSING_THRESHOLD_MS = 150

const canvasRef = ref<HTMLCanvasElement | null>(null)

let samples: PitchSample[] = []
let noteMarkers: NoteMarker[] = []
const markerHitAreas: MarkerHitArea[] = []
let animationFrameId: number | null = null

let pausedAt: number | null = null

let sustainedMidi: number | null = null
let sustainedStartTime = 0
let lastMarkerTime = 0
let lastSampleTime = 0
let isFirstMarkerPending = true
let wasTransition = false

function midiToY(midi: number, height: number): number {
  const usableHeight = height - PADDING_TOP - PADDING_BOTTOM
  const ratio = (midi - props.midiMin) / (props.midiMax - props.midiMin)

  return PADDING_TOP + usableHeight * (1 - ratio)
}

type ChartGeometry = {
  /* Vertical axis position closest to the Y-axis label gutter. In LTR this
   * is the left axis; in RTL the right axis. Oldest data lands here. */
  labelAxisX: number
  /* Vertical axis on the live-data side. In LTR the right axis; in RTL the left. */
  farAxisX: number
  /* X coordinate where the newest sample is drawn — sits CHART_INSET_RIGHT
   * inside farAxisX so the head dot doesn't crowd the axis line. */
  nowEdgeX: number
  /* Min/max in absolute pixels for clip rects, gridlines, and preview indicators. */
  chartLeftX: number
  chartRightX: number
}

function computeGeometry(width: number, isRtl: boolean): ChartGeometry {
  const labelAxisX = isRtl ? width - LABEL_WIDTH : LABEL_WIDTH
  const farAxisX = isRtl ? PADDING_RIGHT : width - PADDING_RIGHT
  const nowEdgeX = isRtl
    ? PADDING_RIGHT + CHART_INSET_RIGHT
    : width - PADDING_RIGHT - CHART_INSET_RIGHT

  return {
    labelAxisX,
    farAxisX,
    nowEdgeX,
    chartLeftX: Math.min(labelAxisX, farAxisX),
    chartRightX: Math.max(labelAxisX, farAxisX),
  }
}

/* X coordinate of the pickup line / live-pitch circle. In game mode it sits
 * GAME_PICKUP_LINE_RATIO of the way from the label-axis side toward the live
 * edge; in idle preview it stays at the chart center. Anchoring to
 * labelAxisX/farAxisX preserves the correct orientation in both LTR and RTL. */
function pickupLineX(geom: ChartGeometry, isGameActive: boolean): number {
  if (isGameActive) {
    return (
      geom.labelAxisX +
      GAME_PICKUP_LINE_RATIO * (geom.farAxisX - geom.labelAxisX)
    )
  }

  return (geom.chartLeftX + geom.chartRightX) / 2
}

function timeToX(timestamp: number, now: number, geom: ChartGeometry): number {
  const age = now - timestamp
  const ratio = age / HISTORY_WINDOW_MS

  return geom.nowEdgeX + (geom.labelAxisX - geom.nowEdgeX) * ratio
}

function drawPickupLine(
  ctx: CanvasRenderingContext2D,
  geom: ChartGeometry,
  height: number,
) {
  if (!props.targets || props.targets.length === 0) return

  const lineX = pickupLineX(geom, true)
  ctx.save()
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)'
  ctx.lineWidth = 1
  ctx.setLineDash([2, 4])
  ctx.beginPath()
  ctx.moveTo(lineX, PADDING_TOP)
  ctx.lineTo(lineX, height - PADDING_BOTTOM)
  ctx.stroke()
  ctx.restore()
}

function drawTargets(
  ctx: CanvasRenderingContext2D,
  geom: ChartGeometry,
  height: number,
  now: number,
) {
  if (!props.targets || props.targets.length === 0) return

  /* Target circle radius — large enough to be tappable-looking, leaves room for a label above */
  const TARGET_RADIUS = 10

  for (const target of props.targets) {
    const x = timeToX(target.dueTime, now, geom)
    if (
      x < geom.chartLeftX - TARGET_RADIUS ||
      x > geom.chartRightX + TARGET_RADIUS
    ) {
      continue
    }
    const y = midiToY(target.midi, height)

    let fillColor: string
    let strokeColor: string
    if (target.status === 'hit') {
      fillColor = 'rgba(74, 222, 128, 0.85)'
      strokeColor = 'rgba(34, 197, 94, 1)'
    } else if (target.status === 'missed') {
      fillColor = 'rgba(239, 68, 68, 0.35)'
      strokeColor = 'rgba(239, 68, 68, 0.6)'
    } else if (now < target.dueTime + LEAD_IN_MS) {
      /* Approach zone — target hasn't crossed the pickup line yet and can't
       * be captured. Grey fill signals "not yet active"; flips to white once
       * the target enters the capturable zone. */
      fillColor = 'rgba(148, 163, 184, 0.55)'
      strokeColor = 'rgba(148, 163, 184, 0.9)'
    } else {
      fillColor = 'rgba(255, 255, 255, 0.95)'
      strokeColor = 'rgba(148, 163, 184, 0.9)'
    }

    ctx.beginPath()
    ctx.arc(x, y, TARGET_RADIUS, 0, Math.PI * 2)
    ctx.fillStyle = fillColor
    ctx.fill()
    ctx.lineWidth = 2
    ctx.strokeStyle = strokeColor
    ctx.stroke()

    const label = midiToNoteLabel(target.midi).label
    ctx.font = 'bold 11px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)'
    ctx.fillText(label, x, y)
  }
}

function drawPreviewIndicator(
  ctx: CanvasRenderingContext2D,
  geom: ChartGeometry,
  height: number,
  now: number,
) {
  if (props.previewMidi == null || props.replayProgress != null) return

  /* Fractional MIDI from Hz for sub-semitone positioning (game-snap below
   * may override). */
  let effectiveMidi = resolveEffectiveMidi(
    props.previewMidi,
    props.previewFrequency,
  )

  /* Game-active mode (simplifyChart=true) communicates the pickup zone
   * explicitly: solid blue from center → label-axis side, dashed orange from
   * center → live-edge side, and the center dot reacts to clean/unclean. */
  const isGameActive = props.simplifyChart === true

  /* When the sung pitch is within the game's hit tolerance of a target that
   * is currently in its capturable pickup zone, snap the dot exactly onto
   * that target's integer-MIDI row so it lines up with the green target
   * circle instead of floating a few cents above/below it. Mirrors the
   * hit-detection window in usePitchGame (same pickup zone + 50¢ tolerance)
   * so the dot snaps precisely when — and only when — a hit can register. */
  if (isGameActive && props.targets) {
    let nearestTargetMidi: number | null = null
    let nearestCents = HIT_TOLERANCE_CENTS
    for (const target of props.targets) {
      if (target.status === 'missed') continue

      const inPickupZone =
        now >= target.dueTime + LEAD_IN_MS &&
        now <= target.dueTime + HISTORY_WINDOW_MS
      if (!inPickupZone) continue

      const centsDiff = Math.abs(effectiveMidi - target.midi) * 100
      if (centsDiff <= nearestCents) {
        nearestCents = centsDiff
        nearestTargetMidi = target.midi
      }
    }
    if (nearestTargetMidi != null) effectiveMidi = nearestTargetMidi
  }

  const previewY = midiToY(effectiveMidi, height)
  /* Red when clamped at boundary (out-of-range), orange when in-range */
  const { clampedY, isOutOfRange } = clampPitchY(
    previewY,
    height,
    PADDING_TOP,
    PADDING_BOTTOM,
  )
  /* Shared orange/red palette for the approach line, label, and the
   * non-game-active dot; the blue pickup segment and the brighter
   * green/orange game-active dot stay local (game-specific cues). */
  const baseColors = pitchLineColors({ isOutOfRange })
  const approachLineColor = baseColors.line
  const pickupLineColor = isOutOfRange
    ? 'rgba(239, 68, 68, 0.45)'
    : 'rgba(56, 189, 248, 0.7)'
  let dotColor: string
  if (isOutOfRange) {
    dotColor = baseColors.dot
  } else if (isGameActive && props.isClean) {
    /* Green matches the PrimeVue --p-green-400 family used for hit targets */
    dotColor = 'rgba(74, 222, 128, 0.9)'
  } else if (isGameActive) {
    dotColor = 'rgba(251, 146, 60, 0.9)'
  } else {
    dotColor = baseColors.dot
  }
  const labelColor = baseColors.label

  const dotX = pickupLineX(geom, isGameActive)

  ctx.save()
  if (isGameActive) {
    /* Approach segment — pickup line to live-edge side: dashed orange */
    ctx.strokeStyle = approachLineColor
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(dotX, clampedY)
    ctx.lineTo(geom.farAxisX, clampedY)
    ctx.stroke()

    /* Pickup segment — pickup line to label-axis side: solid blue, slightly thicker */
    ctx.strokeStyle = pickupLineColor
    ctx.lineWidth = 2
    ctx.setLineDash([])
    ctx.beginPath()
    ctx.moveTo(dotX, clampedY)
    ctx.lineTo(geom.labelAxisX, clampedY)
    ctx.stroke()
  } else {
    /* Idle preview — single dashed orange line spanning the chart */
    ctx.strokeStyle = approachLineColor
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(geom.chartLeftX, clampedY)
    ctx.lineTo(geom.chartRightX, clampedY)
    ctx.stroke()
  }
  ctx.restore()

  /* Circle sits on the pickup line (or chart center in idle mode) */
  const PREVIEW_RADIUS = 5
  ctx.beginPath()
  ctx.arc(dotX, clampedY, PREVIEW_RADIUS, 0, Math.PI * 2)
  ctx.fillStyle = dotColor
  ctx.fill()

  /* Note label sits next to the dot on the reading-trailing side, mirroring in RTL */
  if (props.previewNoteLabel) {
    ctx.font = 'bold 13px monospace'
    ctx.fillStyle = labelColor
    ctx.textAlign = props.isRtl ? 'end' : 'start'
    ctx.textBaseline = 'middle'
    const labelOffset = PREVIEW_RADIUS + 6
    const labelX = props.isRtl ? dotX - labelOffset : dotX + labelOffset
    ctx.fillText(props.previewNoteLabel, labelX, clampedY)
  }
}

function drawChart() {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const dpr = window.devicePixelRatio || 1
  const parent = canvas.parentElement
  if (!parent) return

  const rect = parent.getBoundingClientRect()
  const width = rect.width
  const height = rect.height

  canvas.width = width * dpr
  canvas.height = height * dpr
  ctx.scale(dpr, dpr)

  ctx.clearRect(0, 0, width, height)

  /* Resolve PrimeVue theme colors once per frame */
  const borderColor = resolveCssColor('--p-content-border-color')
  const textColor = resolveCssColor('--p-text-color')
  const contentBg = resolveCssColor('--p-content-background')
  const gridLineColor = withAlpha(borderColor, 0.5)
  const gridLineActiveColor = 'rgba(74, 222, 128, 0.5)'
  const markerDotColor = textColor
  const markerLabelColor = textColor
  const labelBgColor = withAlpha(contentBg, 0.9)
  const headGlowColor = withAlpha(textColor, 0.25)

  const geom = computeGeometry(width, props.isRtl ?? false)

  // Draw horizontal grid lines at octave boundaries
  ctx.lineWidth = 1
  const activeMidiValue = props.activeMidi

  for (let i = 0; i < props.gridMidis.length; i++) {
    const midi = props.gridMidis[i]
    const y = midiToY(midi, height)
    ctx.strokeStyle =
      midi === activeMidiValue ? gridLineActiveColor : gridLineColor
    ctx.beginPath()
    ctx.moveTo(geom.chartLeftX, y)
    ctx.lineTo(geom.chartRightX, y)
    ctx.stroke()
  }

  // Draw vertical axis lines (label-side and far-side)
  ctx.strokeStyle = gridLineColor
  ctx.beginPath()
  ctx.moveTo(geom.labelAxisX, PADDING_TOP)
  ctx.lineTo(geom.labelAxisX, height - PADDING_BOTTOM)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(geom.farAxisX, PADDING_TOP)
  ctx.lineTo(geom.farAxisX, height - PADDING_BOTTOM)
  ctx.stroke()

  /* During replay, drive the entire rendering pipeline off a virtual `now`
   * that advances from the oldest retained sample to the newest based on
   * replayProgress. The visible 5 s window then scrolls naturally over the
   * full retained history without any per-element replay logic. */
  const isReplaying = props.replayProgress != null && samples.length > 0
  const now = isReplaying
    ? samples[0].timestamp +
      (props.replayProgress as number) *
        (samples[samples.length - 1].timestamp - samples[0].timestamp)
    : (pausedAt ?? performance.now())

  // Scrolling vertical time markers — march away from the live edge toward the label edge
  {
    const usableWidth = geom.chartRightX - geom.chartLeftX
    const offsetMs =
      props.isListening || pausedAt !== null || isReplaying
        ? now % TIME_MARKER_INTERVAL_MS
        : 0
    const offsetPx = (offsetMs / HISTORY_WINDOW_MS) * usableWidth
    const stepPx = (TIME_MARKER_INTERVAL_MS / HISTORY_WINDOW_MS) * usableWidth
    /* sign === 1: stepping leftward (LTR — live edge on right);
     * sign === -1: stepping rightward (RTL — live edge on left) */
    const sign = geom.farAxisX > geom.labelAxisX ? 1 : -1

    ctx.lineWidth = 1
    for (
      let x = geom.farAxisX - sign * offsetPx;
      sign * (x - geom.labelAxisX) > 0;
      x -= sign * stepPx
    ) {
      // Skip lines that overlap the live-edge axis border
      if (Math.abs(x - geom.farAxisX) < 0.5) continue

      ctx.strokeStyle = gridLineColor
      ctx.beginPath()
      ctx.moveTo(x, PADDING_TOP)
      ctx.lineTo(x, height - PADDING_BOTTOM)
      ctx.stroke()
    }
  }

  /* Game pickup boundary and target notes. Targets render unclipped so circles
   * near the chart edges stay full (drawTargets already pre-culls anything
   * more than TARGET_RADIUS outside the chart bounds). */
  drawPickupLine(ctx, geom, height)
  if (props.targets && props.targets.length > 0) {
    drawTargets(ctx, geom, height, now)
  }

  if (samples.length === 0) {
    drawPreviewIndicator(ctx, geom, height, now)

    return
  }

  // Clip all pitch drawing to the chart area so lines never overlap the labels.
  ctx.save()
  ctx.beginPath()
  ctx.rect(
    geom.chartLeftX,
    PADDING_TOP,
    geom.chartRightX - geom.chartLeftX,
    height - PADDING_TOP - PADDING_BOTTOM,
  )
  ctx.clip()

  // Draw smooth Catmull-Rom spline with per-segment cents-based coloring
  ctx.lineWidth = 4
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'

  type ChartPoint = { x: number; y: number; cents: number }

  /*
   * Split samples into segments separated by singing pauses.
   * Each segment is an independent run of consecutive samples
   * with no gap exceeding PAUSE_GAP_MS between neighbours.
   */
  const segments: ChartPoint[][] = []
  let currentSegment: ChartPoint[] = []

  for (let i = 0; i < samples.length; i++) {
    if (
      i > 0 &&
      samples[i].timestamp - samples[i - 1].timestamp > PAUSE_GAP_MS
    ) {
      if (currentSegment.length > 0) segments.push(currentSegment)
      currentSegment = []
    }
    currentSegment.push({
      x: timeToX(samples[i].timestamp, now, geom),
      y: midiToY(samples[i].midiNote, height),
      cents: samples[i].cents,
    })
  }
  if (currentSegment.length > 0) segments.push(currentSegment)

  /* Draw each segment as an independent Catmull-Rom spline */
  for (const points of segments) {
    if (points.length >= 2) {
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[Math.max(0, i - 1)]
        const p1 = points[i]
        const p2 = points[i + 1]
        const p3 = points[Math.min(points.length - 1, i + 2)]

        // Catmull-Rom tangent: dividing by 6 gives ⅓ of the chord length,
        // producing a smooth spline without overshooting between points.
        const cp1x = p1.x + (p2.x - p0.x) / 6
        const cp1y = p1.y + (p2.y - p0.y) / 6
        const cp2x = p2.x - (p3.x - p1.x) / 6
        const cp2y = p2.y - (p3.y - p1.y) / 6

        const avgCents = (Math.abs(p1.cents) + Math.abs(p2.cents)) / 2
        const [r, g, b] = cleanColorRgb(avgCents)

        ctx.beginPath()
        ctx.moveTo(p1.x, p1.y)
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y)
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.7)`
        ctx.stroke()
      }
    } else if (points.length === 1) {
      ctx.beginPath()
      ctx.moveTo(points[0].x, points[0].y)
      ctx.lineTo(points[0].x, points[0].y)
      ctx.strokeStyle = cleanColor(points[0].cents, 0.7)
      ctx.stroke()
    }
  }

  // Draw dots
  for (const sample of samples) {
    const x = timeToX(sample.timestamp, now, geom)
    const y = midiToY(sample.midiNote, height)
    const age = now - sample.timestamp
    // Fade old samples — 0.15 minimum so the oldest dots are still faintly visible
    const opacity = Math.max(0.15, 1 - age / HISTORY_WINDOW_MS)

    ctx.beginPath()
    // Clean samples: 2 px dot; unclean: 1.5 px — visual hint of signal quality
    ctx.arc(x, y, sample.isClean ? 2 : 1.5, 0, Math.PI * 2)
    // Unclean samples rendered at 60% opacity to dim them relative to clean ones
    ctx.fillStyle = sample.isClean
      ? cleanColor(sample.cents, opacity)
      : `rgba(250, 204, 21, ${opacity * 0.6})`
    ctx.fill()
  }

  // Draw sustained-note markers (dot + label)
  markerHitAreas.length = 0
  for (const marker of noteMarkers) {
    const x = timeToX(marker.timestamp, now, geom)
    const y = midiToY(marker.midiNote, height)

    // Sustained marker dot: 4 px radius for visibility at chart scale
    ctx.beginPath()
    ctx.arc(x, y, 4, 0, Math.PI * 2)
    ctx.fillStyle = markerDotColor
    ctx.fill()

    if (marker.showLabel) {
      ctx.font = '12px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      const labelX = x
      const labelY = y - 13
      const textMetrics = ctx.measureText(marker.label)
      const padH = 3
      const padV = 1
      const bgW = textMetrics.width + padH * 2
      const bgH = 12 + padV * 2
      const bgX = labelX - bgW / 2
      const bgY = labelY - bgH / 2
      const bgR = 3 // corner radius for the label background pill

      ctx.fillStyle = labelBgColor
      ctx.beginPath()
      ctx.roundRect(bgX, bgY, bgW, bgH, bgR)
      ctx.fill()

      ctx.fillStyle = markerLabelColor
      ctx.fillText(marker.label, labelX, labelY)

      markerHitAreas.push({
        x: bgX,
        y: bgY,
        w: bgW,
        h: bgH,
        midiNote: marker.midiNote,
      })
    }
  }

  /* Capture the "live-edge" sample before restoring the clip so the head dot
   * can be drawn unclipped. During replay, the live edge is the most recent
   * sample with timestamp <= virtual now. */
  let latestSample: PitchSample | null = null
  if (isReplaying) {
    for (let i = samples.length - 1; i >= 0; i--) {
      if (samples[i].timestamp <= now) {
        latestSample = samples[i]
        break
      }
    }
  } else {
    latestSample = samples[samples.length - 1] ?? null
  }

  ctx.restore()

  // Draw prominent head dot outside the clip so it is never cut off by the right boundary.
  if (latestSample && latestSample.isClean) {
    const headX = timeToX(latestSample.timestamp, now, geom)
    const headY = midiToY(latestSample.midiNote, height)
    const headColor = cleanColor(latestSample.cents, 1)

    // Head dot: outer glow ring (7 px) + solid color center (5 px)
    ctx.beginPath()
    ctx.arc(headX, headY, 7, 0, Math.PI * 2)
    ctx.fillStyle = headGlowColor
    ctx.fill()

    ctx.beginPath()
    ctx.arc(headX, headY, 5, 0, Math.PI * 2)
    ctx.fillStyle = headColor
    ctx.fill()
  }

  /* Idle preview indicator — orange circle + dashed line + optional note label */
  drawPreviewIndicator(ctx, geom, height, now)
}

function renderLoop() {
  drawChart()
  animationFrameId = requestAnimationFrame(renderLoop)
}

function startRendering() {
  if (animationFrameId !== null) return

  renderLoop()
}

function stopRendering() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
}

function handleCanvasClick(event: MouseEvent) {
  if (props.isListening) return

  const { offsetX, offsetY } = event
  const hit = markerHitAreas.find(
    (area) =>
      offsetX >= area.x &&
      offsetX <= area.x + area.w &&
      offsetY >= area.y &&
      offsetY <= area.y + area.h,
  )
  if (!hit) return

  emit('markerClick', hit.midiNote)
}

watch(
  () => props.noteInfo,
  (info) => {
    if (!info || !props.isClean) return
    /* In simplify mode, skip the history pipeline entirely — the live cursor
     * is drawn directly from props.noteInfo each frame. */
    if (props.simplifyChart) return

    const now = performance.now()

    /*
     * Use fractional MIDI from the already-smoothed frequency to avoid
     * integer semitone staircase jumps caused by Math.round in frequencyToNote.
     * MIDI formula on the already-smoothed frequency for sub-semitone precision
     */
    const fractionalMidi = 12 * Math.log2(info.frequency / 440) + 69

    samples.push({
      midiNote: fractionalMidi,
      timestamp: now,
      isClean: props.isClean,
      cents: info.cents,
    })

    const isPause = lastSampleTime > 0 && now - lastSampleTime > PAUSE_GAP_MS
    lastSampleTime = now

    // Detect sustained note — only place markers after holding for threshold
    const roundedMidi = Math.round(fractionalMidi)
    if (roundedMidi !== sustainedMidi || isPause) {
      wasTransition =
        sustainedMidi !== null &&
        now - sustainedStartTime < SUSTAINED_THRESHOLD_MS
      sustainedMidi = roundedMidi
      sustainedStartTime = now
      lastMarkerTime = 0
      isFirstMarkerPending = true
    } else {
      const firstMarkerThreshold = wasTransition
        ? SUSTAINED_PASSING_THRESHOLD_MS
        : SUSTAINED_THRESHOLD_MS

      if (
        isFirstMarkerPending &&
        now - sustainedStartTime >= firstMarkerThreshold
      ) {
        const noteLabel = midiToNoteLabel(roundedMidi)
        noteMarkers.push({
          midiNote: roundedMidi,
          timestamp: now,
          label: noteLabel.label,
          showLabel: true,
        })
        lastMarkerTime = now
        isFirstMarkerPending = false
      } else if (
        !isFirstMarkerPending &&
        now - lastMarkerTime >= SUSTAINED_THRESHOLD_MS
      ) {
        const noteLabel = midiToNoteLabel(roundedMidi)
        noteMarkers.push({
          midiNote: roundedMidi,
          timestamp: now,
          label: noteLabel.label,
          showLabel: false,
        })
        lastMarkerTime = now
      }
    }

    // Prune old samples
    const cutoff = now - HISTORY_RETENTION_MS
    while (samples.length > 0 && samples[0].timestamp < cutoff) {
      samples.shift()
    }

    while (noteMarkers.length > 0 && noteMarkers[0].timestamp < cutoff) {
      noteMarkers.shift()
    }
  },
)

watch(
  () => [props.midiMin, props.midiMax],
  () => drawChart(),
)

watch(
  () => props.isRtl,
  () => drawChart(),
)

watch(
  () => props.activeMidi,
  () => drawChart(),
)

watch(
  () => props.isListening,
  (listening) => {
    if (listening) {
      pausedAt = null
      samples = []
      noteMarkers = []
      sustainedMidi = null
      sustainedStartTime = 0
      lastMarkerTime = 0
      lastSampleTime = 0
      isFirstMarkerPending = true
      wasTransition = false
      startRendering()
    } else {
      pausedAt = performance.now()
      /* Game canvas never replays history — drop any in-flight samples so the
       * Complete-state freeze frame doesn't paint a stray trace or head dot. */
      samples = []
      noteMarkers = []
      drawChart()
      /* Keep rendering if the idle preview is active */
      if (props.previewMidi == null) {
        stopRendering()
      }
    }
  },
)

watch(
  () => props.replayProgress,
  (progress) => {
    if (progress != null) {
      startRendering()
    } else if (!props.isListening) {
      drawChart()
      stopRendering()
    }
  },
)

watch(
  () => props.previewMidi,
  (midi) => {
    if (props.isListening) return

    if (midi != null) {
      startRendering()
    } else if (props.replayProgress == null) {
      drawChart()
      stopRendering()
    }
  },
)

/* When previewMidi stays constant but the frequency or label moves (e.g. the
 * simulated cents slider on a test page), the existing previewMidi watcher
 * won't fire and the render loop may not be running — repaint explicitly. */
watch(
  () => [props.previewFrequency, props.previewNoteLabel],
  () => {
    if (props.isListening) return
    if (props.previewMidi == null) return

    drawChart()
  },
)

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  nextTick(() => {
    drawChart()
  })

  const canvas = canvasRef.value
  const parent = canvas?.parentElement
  if (parent) {
    resizeObserver = new ResizeObserver(() => {
      drawChart()
    })
    resizeObserver.observe(parent)
  }
})

function getSamples(): PitchSample[] {
  return [...samples]
}

function getTargetViewportOrigin(
  targetId: number,
): { x: number; y: number } | null {
  const canvas = canvasRef.value
  const parent = canvas?.parentElement
  if (!canvas || !parent) return null

  const target = props.targets?.find((t) => t.id === targetId)
  if (!target) return null

  const rect = parent.getBoundingClientRect()
  const now = pausedAt ?? performance.now()
  const geom = computeGeometry(rect.width, props.isRtl ?? false)
  const x = timeToX(target.dueTime, now, geom)
  const y = midiToY(target.midi, rect.height)

  return {
    x: (rect.left + x) / window.innerWidth,
    y: (rect.top + y) / window.innerHeight,
  }
}

defineExpose({ getSamples, getTargetViewportOrigin })

onUnmounted(() => {
  stopRendering()
  resizeObserver?.disconnect()
  resizeObserver = null
})
</script>

<template>
  <canvas
    ref="canvasRef"
    class="absolute inset-0 h-full w-full rounded-lg bg-(--p-content-background) dark:bg-(--p-surface-900)/50"
    :class="!isListening ? 'cursor-pointer' : ''"
    @click="handleCanvasClick"
  />
</template>
