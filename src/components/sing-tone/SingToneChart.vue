<script setup lang="ts">
import {
  CHART_LABEL_ACTIVE,
  CHART_LABEL_BASE,
  CHART_LABEL_INACTIVE,
} from '@/constants/chartStyles'
import { TONE_CLICK_HIGHLIGHT_DURATION_MS } from '@/constants/toneConstants'
import { getAdaptiveGridDivisions } from '@/utils/chartGrid'
import type { MidiNoteLabel, NoteName } from '@/utils/noteUtils'
import { midiToNoteLabel, noteToFrequency } from '@/utils/noteUtils'
import { drawPitchLine } from '@/utils/pitchLineRenderer'
import SingToneTargetFeedback from './SingToneTargetFeedback.vue'
import { SING_TONE_PREVIEW_DURATION_S } from './useSingTone'

type Props = {
  targetMidi: number | null
  currentMidi: number | null
  currentFrequency?: number | null
  midiMin: number
  midiMax: number
  isSingingCorrectNote: boolean
  holdProgress: number
  highlightedMidi?: number | null
  onTonePlayed?: () => void
  /* Note-target overlay props (only used while game is playing) */
  showOverlay?: boolean
  overlayTargetNoteLabel?: MidiNoteLabel | null
  overlayCentsFromTarget?: number | null
  overlayTargetFrequency?: number | null
  overlayCurrentFrequency?: number | null
  overlayShowSingHigherArrow?: boolean
  overlayShowSingLowerArrow?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  currentFrequency: null,
  highlightedMidi: null,
  onTonePlayed: undefined,
  showOverlay: false,
  overlayTargetNoteLabel: null,
  overlayCentsFromTarget: null,
  overlayTargetFrequency: null,
  overlayCurrentFrequency: null,
  overlayShowSingHigherArrow: false,
  overlayShowSingLowerArrow: false,
})

type GridNote = {
  midi: number
  label: string
  note: NoteName
  octave: number
}

const PADDING_TOP = 16
const PADDING_BOTTOM = 16
const LABEL_WIDTH = 40
const PADDING_RIGHT = 16
/* Target dot radii */
const TARGET_RADIUS = 10
const TARGET_GLOW_RADIUS = 16
/* When the overlay is shown, the target dot is shifted left so the
 * feedback panel can sit alongside it on the right. On narrow charts
 * (e.g. ≤360 px Android) the dot moves further left so the panel still
 * fits inside the chart's right edge. */
const NARROW_CHART_WIDTH_PX = 360
const DOT_X_FRACTION_WITH_OVERLAY = 0.3
const DOT_X_FRACTION_WITH_OVERLAY_NARROW = 0.18
const DOT_X_FRACTION_DEFAULT = 0.5
/* Horizontal gap between the target dot's outer edge and the overlay's
 * left edge — sized to clear the orange singer dot + 2-char label drawn
 * at `chartCenterX + PITCH_LINE_STYLE.dotRadius + 6` plus ~14 px of text
 * width. */
const OVERLAY_DOT_GAP_PX = 28
/* Keep the overlay slightly inset from the chart's vertical edges. */
const OVERLAY_EDGE_INSET_PX = 4

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLElement | null>(null)
const containerHeight = ref(0)

/* Reactive position of the animated target dot for the overlay button */
const targetDotY = ref<number | null>(null)
const chartCenterXRef = ref(0)

let animationFrameId: number | null = null

/* Smoothly animated Y position for the target dot */
let animatedTargetY: number | null = null
const ANIMATION_SPEED = 0.12

/* Tracks whether the singer/preview line was drawn last frame, so we log
 * only on the first frame it becomes visible (not every animation tick). */
let wasSingerLineDrawn = false

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

function midiToY(midi: number, height: number): number {
  const usableHeight = height - PADDING_TOP - PADDING_BOTTOM
  const ratio = (midi - props.midiMin) / (props.midiMax - props.midiMin)

  return PADDING_TOP + usableHeight * (1 - ratio)
}

/*
 * Build grid reference notes at even intervals from midiMin.
 * Adaptive step: ~5 grid lines at default canvas height, ~9 at ≥ MEDIUM,
 * or ~13 at ≥ TALL (showing every semitone for small ranges like C3–C4).
 */
const gridNotes = computed<GridNote[]>(() => {
  const notes: GridNote[] = []
  const range = props.midiMax - props.midiMin
  const divisions = getAdaptiveGridDivisions(containerHeight.value)
  const step = Math.max(1, Math.round(range / divisions))

  for (let midi = props.midiMin; midi <= props.midiMax; midi += step) {
    const info = midiToNoteLabel(midi)
    notes.push({
      midi,
      label: info.label,
      note: info.note,
      octave: info.octave,
    })
  }

  if (notes.length === 0 || notes[notes.length - 1].midi !== props.midiMax) {
    const info = midiToNoteLabel(props.midiMax)
    notes.push({
      midi: props.midiMax,
      label: info.label,
      note: info.note,
      octave: info.octave,
    })
  }

  return notes
})

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

const { playTone } = useTonePlayer()

const clickedMidi = ref<number | null>(null)
let clickedTimer: ReturnType<typeof setTimeout> | null = null

const activeMidi = computed(() => props.highlightedMidi ?? clickedMidi.value)

const targetDotInfo = computed(() => {
  if (props.targetMidi === null || targetDotY.value === null) return null

  const info = midiToNoteLabel(props.targetMidi)

  return {
    midi: props.targetMidi,
    note: info.note,
    octave: info.octave,
    y: targetDotY.value,
    x: chartCenterXRef.value,
  }
})

function handleLabelClick(note: NoteName, octave: number, midi: number) {
  if (clickedTimer) clearTimeout(clickedTimer)

  clickedMidi.value = midi
  playTone(noteToFrequency(note, octave), SING_TONE_PREVIEW_DURATION_S)
  props.onTonePlayed?.()

  clickedTimer = setTimeout(() => {
    clickedMidi.value = null
    clickedTimer = null
  }, TONE_CLICK_HIGHLIGHT_DURATION_MS)
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
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  ctx.clearRect(0, 0, width, height)

  const chartLeft = LABEL_WIDTH
  const chartRight = width - PADDING_RIGHT
  /* Shift the dot left when the overlay is shown to make room for the
   * feedback panel on its right. Narrow charts shift further left and
   * shrink the dot→overlay gap so the panel still fits inside the
   * chart's right edge. */
  const isNarrow = width < NARROW_CHART_WIDTH_PX
  const dotXFraction = props.showOverlay
    ? isNarrow
      ? DOT_X_FRACTION_WITH_OVERLAY_NARROW
      : DOT_X_FRACTION_WITH_OVERLAY
    : DOT_X_FRACTION_DEFAULT
  const chartCenterX = chartLeft + (chartRight - chartLeft) * dotXFraction
  chartCenterXRef.value = chartCenterX

  /* Resolve PrimeVue theme colors for canvas drawing */
  const textColor = getCssVar('--p-text-color') || '#334155'
  const borderColor = getCssVar('--p-content-border-color') || '#e2e8f0'

  /* Draw horizontal grid lines */
  ctx.lineWidth = 1
  const activeMidiValue = activeMidi.value
  const gridLineGrey = hexToRgba(borderColor, 0.5)
  const gridLineGreen = 'rgba(74, 222, 128, 0.5)'
  for (const note of gridNotes.value) {
    const y = midiToY(note.midi, height)
    ctx.strokeStyle =
      note.midi === activeMidiValue ? gridLineGreen : gridLineGrey
    ctx.beginPath()
    ctx.moveTo(chartLeft, y)
    ctx.lineTo(chartRight, y)
    ctx.stroke()
  }

  /* Target dot */
  if (props.targetMidi !== null) {
    const targetY = midiToY(props.targetMidi, height)

    /* Smooth animation toward target Y */
    if (animatedTargetY === null) {
      animatedTargetY = targetY
    } else {
      animatedTargetY += (targetY - animatedTargetY) * ANIMATION_SPEED
    }

    const dotY = animatedTargetY

    /* Hold progress ring */
    if (props.holdProgress > 0) {
      ctx.beginPath()
      /* Arc from top (-π/2) sweeping clockwise by holdProgress */
      ctx.arc(
        chartCenterX,
        dotY,
        TARGET_GLOW_RADIUS,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * props.holdProgress,
      )
      ctx.strokeStyle = props.isSingingCorrectNote
        ? 'rgba(74, 222, 128, 0.6)'
        : hexToRgba(textColor, 0.2)
      ctx.lineWidth = 3
      ctx.stroke()
    }

    /* Glow */
    ctx.beginPath()
    ctx.arc(chartCenterX, dotY, TARGET_GLOW_RADIUS, 0, Math.PI * 2)
    ctx.fillStyle = props.isSingingCorrectNote
      ? 'rgba(74, 222, 128, 0.15)'
      : hexToRgba(textColor, 0.06)
    ctx.fill()

    /* Solid dot */
    ctx.beginPath()
    ctx.arc(chartCenterX, dotY, TARGET_RADIUS, 0, Math.PI * 2)
    ctx.fillStyle = props.isSingingCorrectNote ? '#4ade80' : textColor
    ctx.fill()

    /* Note label to the left of the dot */
    const info = midiToNoteLabel(props.targetMidi)
    ctx.font = 'bold 14px monospace'
    ctx.fillStyle = props.isSingingCorrectNote
      ? 'rgba(74, 222, 128, 0.9)'
      : hexToRgba(textColor, 0.7)
    ctx.textAlign = 'end'
    ctx.textBaseline = 'middle'
    ctx.fillText(info.label, chartCenterX - TARGET_GLOW_RADIUS - 6, dotY)

    targetDotY.value = dotY
  } else {
    targetDotY.value = null
  }

  /* Singer's current pitch indicator */
  if (props.currentMidi !== null) {
    if (!wasSingerLineDrawn) {
      debugLog(
        '[SingTone] orange preview line displayed',
        {
          midi: props.currentMidi,
        },
        Date.now(),
      )
    }
    wasSingerLineDrawn = true

    /* sing-tone shows no cents on the label (centsThreshold null) and hides
     * it entirely when on target so it doesn't overlap the target label. */
    drawPitchLine(ctx, {
      midi: props.currentMidi,
      frequency: props.currentFrequency ?? null,
      height,
      midiToY: (midi) => midiToY(midi, height),
      lineX0: chartLeft,
      lineX1: chartRight,
      dotX: chartCenterX,
      isCorrect: props.isSingingCorrectNote,
      hideLabelWhenCorrect: true,
      centsThreshold: null,
    })
  } else {
    wasSingerLineDrawn = false
  }

  animationFrameId = requestAnimationFrame(drawChart)
}

function updateContainerHeight() {
  if (containerRef.value) {
    containerHeight.value = containerRef.value.getBoundingClientRect().height
  }
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  nextTick(() => {
    updateContainerHeight()
  })

  if (containerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      updateContainerHeight()
    })
    resizeObserver.observe(containerRef.value)
  }

  animationFrameId = requestAnimationFrame(drawChart)
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  resizeObserver = null

  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }

  if (clickedTimer) {
    clearTimeout(clickedTimer)
    clickedTimer = null
  }
})

const gridNoteCount = computed(() => gridNotes.value.length)

/* --- Note-target overlay (mirrors DoReMi pattern) ---
 * Positioned absolutely inside the chart container; anchored 1.5 semitones
 * toward the chart center from the target dot, flipping above/below as the
 * target crosses the midpoint. Height is measured live so the upper-half
 * placement can compute the overlay's top edge as (anchorY - overlayHeight). */
const overlayElement = ref<HTMLElement | null>(null)
const overlayHeight = ref(0)
let overlayResizeObserver: ResizeObserver | null = null

/* Suppress slide-in on first paint */
const hasOverlayInitialPositioned = ref(false)

const overlayStyle = computed<{ transform: string } | null>(() => {
  if (!props.showOverlay || props.targetMidi === null) return null

  const height = containerHeight.value
  if (!height) return null

  /* Vertical: centre overlay on the target's Y, then clamp to the chart
   * bounds so it never overflows top/bottom (e.g. for an extreme target).
   * On the very first render `overlayHeight` is 0 — the ResizeObserver
   * fires once the overlay is in the DOM and re-evaluates this style. */
  const targetY = midiToY(props.targetMidi, height)
  const halfOverlay = overlayHeight.value / 2
  const minTop = OVERLAY_EDGE_INSET_PX
  const maxTop = Math.max(
    OVERLAY_EDGE_INSET_PX,
    height - overlayHeight.value - OVERLAY_EDGE_INSET_PX,
  )
  const rawTop = targetY - halfOverlay
  const topPx = Math.max(minTop, Math.min(maxTop, rawTop))

  return { transform: `translateY(${topPx}px)` }
})

watch(overlayElement, (element, _previous, onCleanup) => {
  if (!element) return

  overlayResizeObserver = new ResizeObserver((entries) => {
    const entry = entries[0]
    if (!entry) return

    overlayHeight.value = entry.contentRect.height
  })
  overlayResizeObserver.observe(element)

  overlayHeight.value = element.offsetHeight
  requestAnimationFrame(() => {
    hasOverlayInitialPositioned.value = true
  })

  onCleanup(() => {
    overlayResizeObserver?.disconnect()
    overlayResizeObserver = null
    hasOverlayInitialPositioned.value = false
  })
})

defineExpose({ gridNotes, gridNoteCount })
</script>

<template>
  <div
    ref="containerRef"
    class="relative my-4 max-h-200 min-h-64 w-full max-w-4xl flex-1 overflow-clip"
  >
    <canvas ref="canvasRef" class="absolute inset-0 size-full" />
    <button
      v-for="pos in labelPositions"
      :key="pos.midi"
      :class="[
        CHART_LABEL_BASE,
        activeMidi === pos.midi ? CHART_LABEL_ACTIVE : CHART_LABEL_INACTIVE,
      ]"
      :style="{
        top: `${pos.y}px`,
        width: '36px',
        textAlign: 'right',
      }"
      :title="`Play ${pos.label}`"
      @click="handleLabelClick(pos.note, pos.octave, pos.midi)"
    >
      {{ pos.label }}
    </button>
    <button
      v-if="targetDotInfo"
      class="absolute -translate-y-1/2 cursor-pointer rounded-full border-none bg-transparent"
      :class="{ 'target-dot-playing': clickedMidi === targetDotInfo.midi }"
      :style="{
        top: `${targetDotInfo.y}px`,
        left: `${targetDotInfo.x - TARGET_GLOW_RADIUS}px`,
        width: `${TARGET_GLOW_RADIUS * 2}px`,
        height: `${TARGET_GLOW_RADIUS * 2}px`,
      }"
      :title="`Play ${midiToNoteLabel(targetDotInfo.midi).label}`"
      @click="
        handleLabelClick(
          targetDotInfo.note,
          targetDotInfo.octave,
          targetDotInfo.midi,
        )
      "
    />

    <div
      v-if="overlayStyle && overlayTargetNoteLabel"
      ref="overlayElement"
      class="pointer-events-none absolute top-0 z-10 will-change-transform"
      :class="
        hasOverlayInitialPositioned
          ? 'transition-transform duration-200 ease-out motion-reduce:transition-none'
          : ''
      "
      :style="[
        overlayStyle,
        {
          insetInlineStart: `${chartCenterXRef + TARGET_GLOW_RADIUS + OVERLAY_DOT_GAP_PX}px`,
        },
      ]"
    >
      <div
        class="max-w-45 rounded-lg border border-(--p-content-border-color)/60 bg-(--p-content-background)/20 px-3 py-2 shadow-sm backdrop-blur-sm"
      >
        <SingToneTargetFeedback
          :targetNoteLabel="overlayTargetNoteLabel"
          :isSingingCorrectNote="isSingingCorrectNote"
          :showSingHigherArrow="overlayShowSingHigherArrow"
          :showSingLowerArrow="overlayShowSingLowerArrow"
          :centsFromTarget="overlayCentsFromTarget"
          :targetFrequency="overlayTargetFrequency"
          :currentFrequency="overlayCurrentFrequency"
          :holdProgress="holdProgress"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.target-dot-playing {
  box-shadow:
    0 0 0 3px var(--p-blue-400),
    0 0 12px 4px var(--p-blue-500);
  transition: box-shadow 0.15s ease;
}
</style>
