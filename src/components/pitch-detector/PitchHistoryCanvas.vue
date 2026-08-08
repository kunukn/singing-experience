<script setup lang="ts">
import { resolveCssColor, withAlpha } from '@/utils/cssColor'
import { cleanColor, cleanColorRgb } from '@/utils/pitchColors'
import { drawPitchLine } from '@/utils/pitchLineRenderer'

import {
  createPitchLaneRecorder,
  pitchLaneExtent,
  type PitchLaneRecorder,
  type PitchSample,
} from './pitchLaneRecorder'
import {
  PITCH_LANE_IDS,
  type PitchLaneDetection,
  type PitchLaneId,
  type PitchPreviewLane,
} from './pitchLanes'
import { HISTORY_WINDOW_MS, PAUSE_GAP_MS } from './pitchConstants'

type Props = {
  /* One entry per singing voice — one 'low' lane in single-voice mode, both
   * lanes once "Two singers" is on. Only sampled while listening. */
  laneDetections: PitchLaneDetection[]
  /* The dashed live-pitch lines. Separate from laneDetections because these are
   * deaf-gated, range-culled and already label-formatted by the parent. */
  previewLanes: PitchPreviewLane[]
  isListening: boolean
  midiMin: number
  midiMax: number
  gridMidis: number[]
  activeMidi?: number | null
  replayProgress?: number | null
  isRtl?: boolean
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
/* px above a dot that its name pill sits — shared by sustained markers and the
 * live head dot, so the two read as one row of labels. */
const LABEL_OFFSET_Y = 13
/* px — a name pill is 14 px tall, so two heads closer than this would overlap
 * their labels; the high lane's is lifted by one more row when they do. */
const LABEL_COLLISION_Y = 26

const canvasRef = ref<HTMLCanvasElement | null>(null)

/*
 * One recorder per voice. Both are created up front and simply stay empty in
 * single-voice mode — cheaper than allocating on the first duet frame, and it
 * keeps every draw and reset path a plain loop over PITCH_LANE_IDS.
 */
const recorders: Record<PitchLaneId, PitchLaneRecorder> = {
  low: createPitchLaneRecorder(),
  high: createPitchLaneRecorder(),
}

/*
 * Both voices keep the cents colouring (green → yellow → red), because each
 * singer still needs to see whether they are in tune. The second voice is told
 * apart by shape instead — a thinner spline and hollow dots — and only its head
 * dot and name pill carry the blue that matches its dashed preview line.
 */
const LANE_TRAIL_STYLE: Record<
  PitchLaneId,
  {
    lineWidth: number
    dotRadius: number
    isDotHollow: boolean
    headTint: string | null
  }
> = {
  low: { lineWidth: 4, dotRadius: 2, isDotHollow: false, headTint: null },
  /* Hollow dots read lighter than filled ones at the same size, so the high
   * lane's are a touch larger to keep both trails equally visible. */
  high: {
    lineWidth: 2,
    dotRadius: 2.5,
    isDotHollow: true,
    headTint: 'rgba(96, 165, 250, 1)', // --p-blue-400
  },
}

const markerHitAreas: MarkerHitArea[] = []
let animationFrameId: number | null = null

let pausedAt: number | null = null

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

/* Every voice's dashed line, drawn at its own pitch in its own hue. */
function drawPreviewIndicators(
  ctx: CanvasRenderingContext2D,
  geom: ChartGeometry,
  height: number,
) {
  if (props.replayProgress != null) return

  for (const lane of props.previewLanes) {
    if (lane.previewMidi == null) continue

    /* pitch-detector uses a forgiving 20¢ threshold so small wobbles don't
     * surface a distracting cents number. */
    drawPitchLine(ctx, {
      midi: lane.previewMidi,
      frequency: lane.previewFrequency ?? null,
      height,
      midiToY: (midi) => midiToY(midi, height),
      lineX0: geom.chartLeftX,
      lineX1: geom.chartRightX,
      dotX: (geom.chartLeftX + geom.chartRightX) / 2,
      centsThreshold: 20,
      isRtl: props.isRtl ?? false,
      noteLabel: lane.previewNoteLabel,
      isHighLane: lane.laneId === 'high',
      /* While listening, keep only the dashed reference line: the center dot and
       * label are redundant with the live head dot, which carries the label instead. */
      showDot: !props.isListening,
      showLabel: !props.isListening && !!lane.previewNoteLabel,
    })
  }
}

/* The label the head dot carries — its own lane's live preview name. */
function previewLabelFor(laneId: PitchLaneId): string | null {
  return (
    props.previewLanes.find((lane) => lane.laneId === laneId)
      ?.previewNoteLabel ?? null
  )
}

/* The rounded name pill shared by sustained markers and live head dots.
 * Returns its box so a marker can register it as a click target. */
function drawLabelPill(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  centerY: number,
  backgroundColor: string,
  textColor: string,
): { x: number; y: number; w: number; h: number } {
  ctx.font = '12px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const textMetrics = ctx.measureText(text)
  const padH = 3
  const padV = 1
  const bgW = textMetrics.width + padH * 2
  const bgH = 12 + padV * 2
  const bgX = centerX - bgW / 2
  const bgY = centerY - bgH / 2
  const bgR = 3 // corner radius for the label background pill

  ctx.fillStyle = backgroundColor
  ctx.beginPath()
  ctx.roundRect(bgX, bgY, bgW, bgH, bgR)
  ctx.fill()

  ctx.fillStyle = textColor
  ctx.fillText(text, centerX, centerY)

  return { x: bgX, y: bgY, w: bgW, h: bgH }
}

/* The spline and dots for one voice. */
function drawLaneTrail(
  ctx: CanvasRenderingContext2D,
  laneId: PitchLaneId,
  samples: PitchSample[],
  now: number,
  geom: ChartGeometry,
  height: number,
) {
  if (samples.length === 0) return

  const style = LANE_TRAIL_STYLE[laneId]

  ctx.lineWidth = style.lineWidth
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
    const color = cleanColor(sample.cents, opacity)

    ctx.beginPath()
    ctx.arc(x, y, style.dotRadius, 0, Math.PI * 2)
    if (style.isDotHollow) {
      /* 1 px ring — any heavier and a hollow dot reads as a filled one. */
      ctx.lineWidth = 1
      ctx.strokeStyle = color
      ctx.stroke()
    } else {
      ctx.fillStyle = color
      ctx.fill()
    }
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
   * full retained history without any per-element replay logic.
   *
   * The extent spans BOTH voices, so a duet's two trails scrub together
   * instead of each running on its own clock. */
  const extent = pitchLaneExtent(PITCH_LANE_IDS.map((id) => recorders[id]))
  const isReplaying = props.replayProgress != null && extent != null
  const now =
    isReplaying && extent
      ? extent.firstTimestamp +
        (props.replayProgress as number) *
          (extent.lastTimestamp - extent.firstTimestamp)
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

  if (!extent) {
    drawPreviewIndicators(ctx, geom, height)

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

  /* Low voice first so the high one's thinner trail stays legible on top. */
  for (const laneId of PITCH_LANE_IDS) {
    drawLaneTrail(ctx, laneId, recorders[laneId].samples, now, geom, height)
  }

  // Draw sustained-note markers (dot + label)
  markerHitAreas.length = 0
  for (const laneId of PITCH_LANE_IDS) {
    for (const marker of recorders[laneId].noteMarkers) {
      const x = timeToX(marker.timestamp, now, geom)
      const y = midiToY(marker.midiNote, height)

      // Sustained marker dot: 4 px radius for visibility at chart scale
      ctx.beginPath()
      ctx.arc(x, y, 4, 0, Math.PI * 2)
      ctx.fillStyle = markerDotColor
      ctx.fill()

      if (marker.showLabel) {
        const hitArea = drawLabelPill(
          ctx,
          marker.label,
          x,
          y - LABEL_OFFSET_Y,
          labelBgColor,
          markerLabelColor,
        )
        markerHitAreas.push({ ...hitArea, midiNote: marker.midiNote })
      }
    }
  }

  /* Capture each voice's "live-edge" sample before restoring the clip so the
   * head dots can be drawn unclipped. During replay, the live edge is the most
   * recent sample with timestamp <= virtual now. */
  const heads: Array<{ laneId: PitchLaneId; sample: PitchSample }> = []
  for (const laneId of PITCH_LANE_IDS) {
    const samples = recorders[laneId].samples
    let latest: PitchSample | null = null

    if (isReplaying) {
      for (let i = samples.length - 1; i >= 0; i--) {
        if (samples[i].timestamp <= now) {
          latest = samples[i]
          break
        }
      }
    } else {
      latest = samples[samples.length - 1] ?? null
    }

    if (latest) heads.push({ laneId, sample: latest })
  }

  ctx.restore()

  /* Two heads at nearly the same pitch would stack their name pills on top of
   * each other, so the high voice's is lifted by one more row when they meet. */
  const isHeadLabelColliding =
    heads.length === 2 &&
    Math.abs(
      midiToY(heads[0].sample.midiNote, height) -
        midiToY(heads[1].sample.midiNote, height),
    ) < LABEL_COLLISION_Y

  // Draw prominent head dots outside the clip so they are never cut off by the right boundary.
  for (const head of heads) {
    const sample = head.sample
    const style = LANE_TRAIL_STYLE[head.laneId]
    const headX = timeToX(sample.timestamp, now, geom)
    const headY = midiToY(sample.midiNote, height)
    const headColor = cleanColor(sample.cents, 1)

    // Head dot: outer glow ring (7 px) + solid color center (5 px)
    ctx.beginPath()
    ctx.arc(headX, headY, 7, 0, Math.PI * 2)
    ctx.fillStyle = style.headTint ?? headGlowColor
    ctx.fill()

    ctx.beginPath()
    ctx.arc(headX, headY, 5, 0, Math.PI * 2)
    ctx.fillStyle = headColor
    ctx.fill()

    /* While listening, the note label lives on the live head dot (not the
     * center preview dot). Drawn above the dot in the sustained-marker style. */
    const label = previewLabelFor(head.laneId)
    if (props.isListening && label) {
      const labelLift =
        isHeadLabelColliding && head.laneId === 'high'
          ? LABEL_OFFSET_Y + LABEL_COLLISION_Y
          : LABEL_OFFSET_Y

      drawLabelPill(
        ctx,
        label,
        headX,
        headY - labelLift,
        labelBgColor,
        style.headTint ?? markerLabelColor,
      )
    }
  }

  /* Idle preview indicator — dashed line + circle + optional note label */
  drawPreviewIndicators(ctx, geom, height)
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
  /* Reverse order so the topmost pill wins where two voices overlap — the high
   * lane's markers are painted last. */
  const hit = markerHitAreas
    .slice()
    .reverse()
    .find(
      (area) =>
        offsetX >= area.x &&
        offsetX <= area.x + area.w &&
        offsetY >= area.y &&
        offsetY <= area.y + area.h,
    )
  if (!hit) return

  emit('markerClick', hit.midiNote)
}

/* Record every clean frame, one buffer per voice. Gated on isListening because
 * laneDetections also carries the idle preview, which must not end up in a
 * recording. */
watch(
  () => props.laneDetections,
  (lanes) => {
    if (!props.isListening) return

    const now = performance.now()
    for (const lane of lanes) {
      if (!lane.isClean || !lane.noteInfo) continue

      recorders[lane.laneId].push(lane.noteInfo, now)
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

/* Any voice showing a live pitch is enough to keep the render loop running. */
const hasPreviewPitch = computed(() =>
  props.previewLanes.some((lane) => lane.previewMidi != null),
)

/* Everything the preview draws, flattened — so a moving frequency or label
 * repaints even while the note itself holds. */
const previewDigest = computed(() =>
  props.previewLanes
    .map(
      (lane) =>
        `${lane.laneId}:${lane.previewMidi}:${lane.previewFrequency}:${lane.previewNoteLabel}`,
    )
    .join('|'),
)

watch(
  () => props.isListening,
  (listening) => {
    if (listening) {
      pausedAt = null
      for (const laneId of PITCH_LANE_IDS) {
        recorders[laneId].reset()
      }
      startRendering()
    } else {
      pausedAt = performance.now()
      drawChart()
      /* Keep rendering if the idle preview is active */
      if (!hasPreviewPitch.value) {
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

watch(hasPreviewPitch, (hasPitch) => {
  if (props.isListening) return

  if (hasPitch) {
    startRendering()
  } else if (props.replayProgress == null) {
    drawChart()
    stopRendering()
  }
})

/* When the pitch holds but the frequency or label moves (e.g. the simulated
 * cents slider on a test page), hasPreviewPitch won't fire and the render loop
 * may not be running — repaint explicitly. */
watch(previewDigest, () => {
  if (props.isListening) return
  if (!hasPreviewPitch.value) return

  drawChart()
})

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

/* A copy per voice, so callers can hold on to a recording while the live
 * buffers keep moving. */
function getSamples(): Record<PitchLaneId, PitchSample[]> {
  return {
    low: [...recorders.low.samples],
    high: [...recorders.high.samples],
  }
}

function clearSamples() {
  pausedAt = null
  for (const laneId of PITCH_LANE_IDS) {
    recorders[laneId].reset()
  }
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
