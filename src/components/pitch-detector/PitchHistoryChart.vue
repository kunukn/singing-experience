<script setup lang="ts">
import { TONE_CLICK_HIGHLIGHT_DURATION_MS } from '@/constants/toneConstants'
import type { NoteInfo, NoteName } from '@/utils/noteUtils'
import { midiToNoteLabel, noteToFrequency } from '@/utils/noteUtils'
import { cleanColor, cleanColorRgb } from '@/utils/pitchColors'

type Props = {
  noteInfo: NoteInfo | null
  isListening: boolean
  isClean: boolean
  midiMin?: number
  midiMax?: number
  highlightedMidi?: number | null
}

type PitchSample = {
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

const props = withDefaults(defineProps<Props>(), {
  midiMin: 36,
  midiMax: 84,
  highlightedMidi: null,
})

type GridNote = {
  midi: number
  label: string
  note: NoteName
  octave: number
}

const HISTORY_DURATION_MS = 5000
const LABEL_WIDTH = 40 // PADDING_LEFT is effectively 0 since labels are flush with left edge, so this is total reserved width for labels
const PADDING_TOP = 16
const PADDING_BOTTOM = 16
const PADDING_RIGHT = 16
const CHART_INSET_RIGHT = 16
const TIME_MARKER_INTERVAL_MS = 250
const SUSTAINED_THRESHOLD_MS = 200
const SUSTAINED_PASSING_THRESHOLD_MS = 150

const { playTone } = useTonePlayer()

const clickedMidi = ref<number | null>(null)
let clickedTimer: ReturnType<typeof setTimeout> | null = null

function handleLabelClick(note: NoteName, octave: number, midi: number) {
  debugLog(`[PitchChart] click ${note}${octave} (midi=${midi})`)
  if (clickedTimer) clearTimeout(clickedTimer)

  clickedMidi.value = midi
  playTone(noteToFrequency(note, octave))

  clickedTimer = setTimeout(() => {
    clickedMidi.value = null
    clickedTimer = null
  }, TONE_CLICK_HIGHLIGHT_DURATION_MS)
}

const activeMidi = computed(() => props.highlightedMidi ?? clickedMidi.value)

/*
 * Build grid reference notes at even intervals from midiMin.
 * The step is adaptive so every range gets ~5 grid lines:
 * Full (4 octaves) → step 12, voice ranges (2 octaves) → step 6.
 */
const gridNotes = computed<GridNote[]>(() => {
  const notes: GridNote[] = []
  const range = props.midiMax - props.midiMin
  const step = Math.max(1, Math.round(range / 4))

  for (let midi = props.midiMin; midi <= props.midiMax; midi += step) {
    const info = midiToNoteLabel(midi)
    notes.push({
      midi,
      label: info.label,
      note: info.note,
      octave: info.octave,
    })
  }

  return notes
})

const gridMidis = computed(() => gridNotes.value.map((n) => n.midi))

const containerRef = ref<HTMLElement | null>(null)
const containerHeight = ref(0)

const labelPositions = computed(() => {
  if (!containerHeight.value) return []

  const height = containerHeight.value
  const usableHeight = height - PADDING_TOP - PADDING_BOTTOM

  return gridNotes.value.map((n) => {
    const ratio = (n.midi - props.midiMin) / (props.midiMax - props.midiMin)
    const y = PADDING_TOP + usableHeight * (1 - ratio)

    return Object.assign({}, n, { y })
  })
})

const canvasRef = ref<HTMLCanvasElement | null>(null)

const color1 = 'rgba(255, 255, 255, 0.2)'
const color2 = 'rgba(255, 255, 255, 1)'

let samples: PitchSample[] = []
let noteMarkers: NoteMarker[] = []
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

function timeToX(timestamp: number, now: number, width: number): number {
  const age = now - timestamp
  const ratio = age / HISTORY_DURATION_MS
  const usableWidth = width - LABEL_WIDTH - PADDING_RIGHT - CHART_INSET_RIGHT

  return LABEL_WIDTH + usableWidth * (1 - ratio)
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

  // Draw horizontal grid lines at octave boundaries
  ctx.strokeStyle = color1
  ctx.lineWidth = 1

  for (let i = 0; i < gridMidis.value.length; i++) {
    const y = midiToY(gridMidis.value[i], height)
    ctx.beginPath()
    ctx.moveTo(LABEL_WIDTH, y)
    ctx.lineTo(width - PADDING_RIGHT, y)
    ctx.stroke()

    // Note labels are rendered as DOM overlay buttons
  }

  // Draw vertical axis lines (left and right)
  ctx.strokeStyle = color1
  ctx.beginPath()
  ctx.moveTo(LABEL_WIDTH, PADDING_TOP)
  ctx.lineTo(LABEL_WIDTH, height - PADDING_BOTTOM)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(width - PADDING_RIGHT, PADDING_TOP)
  ctx.lineTo(width - PADDING_RIGHT, height - PADDING_BOTTOM)
  ctx.stroke()

  const now = pausedAt ?? performance.now()

  // Scrolling vertical time markers
  {
    const usableWidth = width - LABEL_WIDTH - PADDING_RIGHT
    const offsetMs =
      props.isListening || pausedAt !== null ? now % TIME_MARKER_INTERVAL_MS : 0
    const offsetPx = (offsetMs / HISTORY_DURATION_MS) * usableWidth

    ctx.lineWidth = 1
    for (
      let x = width - PADDING_RIGHT - offsetPx;
      x > LABEL_WIDTH;
      x -= (TIME_MARKER_INTERVAL_MS / HISTORY_DURATION_MS) * usableWidth
    ) {
      ctx.strokeStyle = color1
      ctx.beginPath()
      ctx.moveTo(x, PADDING_TOP)
      ctx.lineTo(x, height - PADDING_BOTTOM)
      ctx.stroke()
    }
  }

  if (samples.length === 0) return

  // Clip all pitch drawing to the chart area so lines never overlap the labels.
  ctx.save()
  ctx.beginPath()
  ctx.rect(
    LABEL_WIDTH,
    PADDING_TOP,
    width - LABEL_WIDTH - PADDING_RIGHT,
    height - PADDING_TOP - PADDING_BOTTOM,
  )
  ctx.clip()

  // Draw smooth Catmull-Rom spline with per-segment cents-based coloring
  ctx.lineWidth = 4
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'

  const points: { x: number; y: number; cents: number }[] = []
  for (const sample of samples) {
    points.push({
      x: timeToX(sample.timestamp, now, width),
      y: midiToY(sample.midiNote, height),
      cents: sample.cents,
    })
  }

  if (points.length >= 2) {
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)]
      const p1 = points[i]
      const p2 = points[i + 1]
      const p3 = points[Math.min(points.length - 1, i + 2)]

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

  // Draw dots
  for (const sample of samples) {
    const x = timeToX(sample.timestamp, now, width)
    const y = midiToY(sample.midiNote, height)
    const age = now - sample.timestamp
    const opacity = Math.max(0.15, 1 - age / HISTORY_DURATION_MS)

    ctx.beginPath()
    ctx.arc(x, y, sample.isClean ? 2 : 1.5, 0, Math.PI * 2)
    ctx.fillStyle = sample.isClean
      ? cleanColor(sample.cents, opacity)
      : `rgba(250, 204, 21, ${opacity * 0.6})`
    ctx.fill()
  }

  // Draw sustained-note markers (dot + label)
  for (const marker of noteMarkers) {
    const x = timeToX(marker.timestamp, now, width)
    const y = midiToY(marker.midiNote, height)

    ctx.beginPath()
    ctx.arc(x, y, 4, 0, Math.PI * 2)
    ctx.fillStyle = color2
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
      const bgR = 3

      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)'
      ctx.beginPath()
      ctx.roundRect(bgX, bgY, bgW, bgH, bgR)
      ctx.fill()

      ctx.fillStyle = color2
      ctx.fillText(marker.label, labelX, labelY)
    }
  }

  // Capture latest sample info before restoring the clip so head dot can be drawn unclipped.
  const latestSample = samples[samples.length - 1]
  const latestPoint = points[points.length - 1]

  ctx.restore()

  // Draw prominent head dot outside the clip so it is never cut off by the right boundary.
  if (latestSample && latestPoint && latestSample.isClean) {
    const headColor = cleanColor(latestSample.cents, 1)

    ctx.beginPath()
    ctx.arc(latestPoint.x, latestPoint.y, 7, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)'
    ctx.fill()

    ctx.beginPath()
    ctx.arc(latestPoint.x, latestPoint.y, 5, 0, Math.PI * 2)
    ctx.fillStyle = headColor
    ctx.fill()
  }
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

watch(
  () => props.noteInfo,
  (info) => {
    if (!info || !props.isClean) return

    const now = performance.now()

    // Use fractional MIDI from the already-smoothed frequency to avoid
    // integer semitone staircase jumps caused by Math.round in frequencyToNote.
    const fractionalMidi = 12 * Math.log2(info.frequency / 440) + 69

    samples.push({
      midiNote: fractionalMidi,
      timestamp: now,
      isClean: props.isClean,
      cents: info.cents,
    })

    const isPause =
      lastSampleTime > 0 && now - lastSampleTime > SUSTAINED_THRESHOLD_MS + 100
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
    const cutoff = now - HISTORY_DURATION_MS
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
      stopRendering()
    }
  },
)

function updateContainerHeight() {
  if (containerRef.value) {
    containerHeight.value = containerRef.value.getBoundingClientRect().height
  }
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  nextTick(() => {
    drawChart()
    updateContainerHeight()
  })

  if (containerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      drawChart()
      updateContainerHeight()
    })
    resizeObserver.observe(containerRef.value)
  }
})

onUnmounted(() => {
  stopRendering()
  resizeObserver?.disconnect()
  resizeObserver = null
})
</script>

<template>
  <div
    ref="containerRef"
    class="relative min-h-64 w-full max-w-4xl flex-1 overflow-hidden"
    style="max-height: 50rem"
  >
    <canvas
      ref="canvasRef"
      class="absolute inset-0 h-full w-full rounded-lg bg-gray-900/50"
    />
    <button
      v-for="pos in labelPositions"
      :key="pos.midi"
      :data-testid="`btn-${pos.label}`"
      class="absolute left-0 origin-center -translate-y-1/2 cursor-pointer border-none bg-transparent px-0 font-mono text-base transition-all duration-150"
      :class="
        activeMidi === pos.midi
          ? 'scale-110 text-yellow-400'
          : 'text-white/40 hover:text-white/80'
      "
      :style="{
        top: `${pos.y}px`,
        width: `${LABEL_WIDTH - 4}px`,
        textAlign: 'right',
      }"
      :title="`Play ${pos.label}`"
      @click="handleLabelClick(pos.note, pos.octave, pos.midi)"
    >
      {{ pos.label }}
    </button>
  </div>
</template>

<style scoped></style>
