<script setup lang="ts">
import type { NoteInfo } from '@/utils/noteUtils'
import { midiToNoteLabel } from '@/utils/noteUtils'
import { cleanColor, cleanColorRgb } from '@/utils/pitchColors'
import { drawPitchLine } from '@/utils/pitchLineRenderer'

import {
  HISTORY_RETENTION_MS,
  HISTORY_WINDOW_MS,
  PAUSE_GAP_MS,
} from './pitchConstants'

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

/**
 * Read a PrimeVue CSS variable from :root at render time.
 * Returns the resolved color string (e.g. "#334155").
 */
function getCssVar(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()
}

/**
 * Convert a hex color like "#334155" to an `rgba(r, g, b, alpha)` string.
 */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)

  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

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

function timeToX(timestamp: number, now: number, geom: ChartGeometry): number {
  const age = now - timestamp
  const ratio = age / HISTORY_WINDOW_MS

  return geom.nowEdgeX + (geom.labelAxisX - geom.nowEdgeX) * ratio
}

function drawPreviewIndicator(
  ctx: CanvasRenderingContext2D,
  geom: ChartGeometry,
  height: number,
) {
  if (props.previewMidi == null || props.replayProgress != null) return

  /* pitch-detector uses a forgiving 20¢ threshold so small wobbles don't
   * surface a distracting cents number. */
  drawPitchLine(ctx, {
    midi: props.previewMidi,
    frequency: props.previewFrequency ?? null,
    height,
    midiToY: (midi) => midiToY(midi, height),
    lineX0: geom.chartLeftX,
    lineX1: geom.chartRightX,
    dotX: (geom.chartLeftX + geom.chartRightX) / 2,
    centsThreshold: 20,
    isRtl: props.isRtl ?? false,
    noteLabel: props.previewNoteLabel,
    /* While listening, keep only the dashed reference line: the center dot and
     * label are redundant with the live head dot, which carries the label instead. */
    showDot: !props.isListening,
    showLabel: !props.isListening && !!props.previewNoteLabel,
  })
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
  const borderColor = getCssVar('--p-content-border-color')
  const textColor = getCssVar('--p-text-color')
  const contentBg = getCssVar('--p-content-background')
  const gridLineColor = hexToRgba(borderColor, 0.5)
  const gridLineActiveColor = 'rgba(74, 222, 128, 0.5)'
  const markerDotColor = textColor
  const markerLabelColor = textColor
  const labelBgColor = hexToRgba(contentBg, 0.9)
  const headGlowColor = hexToRgba(textColor, 0.25)

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

  if (samples.length === 0) {
    drawPreviewIndicator(ctx, geom, height)

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

    /* While listening, the note label lives on the live head dot (not the
     * center preview dot). Drawn above the dot in the sustained-marker style. */
    if (props.isListening && props.previewNoteLabel) {
      ctx.font = '12px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      const labelX = headX
      const labelY = headY - 13 // px above the dot — matches sustained markers
      const textMetrics = ctx.measureText(props.previewNoteLabel)
      const padH = 3
      const padV = 1
      const bgW = textMetrics.width + padH * 2
      const bgH = 12 + padV * 2
      const bgR = 3 // corner radius for the label background pill

      ctx.fillStyle = labelBgColor
      ctx.beginPath()
      ctx.roundRect(labelX - bgW / 2, labelY - bgH / 2, bgW, bgH, bgR)
      ctx.fill()

      ctx.fillStyle = markerLabelColor
      ctx.fillText(props.previewNoteLabel, labelX, labelY)
    }
  }

  /* Idle preview indicator — orange circle + dashed line + optional note label */
  drawPreviewIndicator(ctx, geom, height)
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

function clearSamples() {
  pausedAt = null
  samples = []
  noteMarkers = []
  sustainedMidi = null
  sustainedStartTime = 0
  lastMarkerTime = 0
  lastSampleTime = 0
  isFirstMarkerPending = true
  wasTransition = false
  drawChart()
}

defineExpose({ getSamples, clearSamples })

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
