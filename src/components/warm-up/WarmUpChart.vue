<script setup lang="ts">
import { SING_TONE_PREVIEW_DURATION_S } from '@/components/sing-tone/useSingTone'
import {
  CHART_LABEL_ACTIVE,
  CHART_LABEL_BASE,
  CHART_LABEL_INACTIVE,
} from '@/constants/chartStyles'
import { TONE_CLICK_HIGHLIGHT_DURATION_MS } from '@/constants/toneConstants'
import type { NoteName } from '@/utils/noteUtils'
import { midiToNoteLabel, noteToFrequency } from '@/utils/noteUtils'
import { drawPitchLine } from '@/utils/pitchLineRenderer'

type Props = {
  targetMidi: number | null
  currentMidi: number | null
  currentFrequency?: number | null
  midiMin: number
  midiMax: number
  /* Explicit list of MIDI notes to render as grid lines + clickable labels.
   * Unlike SingToneChart, the warm-up chart does no auto-stepping — only the
   * notes in this list are shown, so the singer isn't distracted by chromatic
   * tones the phrase doesn't use. */
  gridMidis: number[]
  isSingingCorrectNote: boolean
  holdProgress: number
  highlightedMidi?: number | null
  onTonePlayed?: () => void
}

const props = withDefaults(defineProps<Props>(), {
  currentFrequency: null,
  highlightedMidi: null,
  onTonePlayed: undefined,
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

function getCssVar(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()
}

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

const gridNotes = computed<GridNote[]>(() =>
  props.gridMidis.map((midi) => {
    const info = midiToNoteLabel(midi)

    return { midi, label: info.label, note: info.note, octave: info.octave }
  }),
)

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
  const chartCenterX = (chartLeft + chartRight) / 2
  chartCenterXRef.value = chartCenterX

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

    if (animatedTargetY === null) {
      animatedTargetY = targetY
    } else {
      animatedTargetY += (targetY - animatedTargetY) * ANIMATION_SPEED
    }

    const dotY = animatedTargetY

    if (props.holdProgress > 0) {
      ctx.beginPath()
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

    ctx.beginPath()
    ctx.arc(chartCenterX, dotY, TARGET_GLOW_RADIUS, 0, Math.PI * 2)
    ctx.fillStyle = props.isSingingCorrectNote
      ? 'rgba(74, 222, 128, 0.15)'
      : hexToRgba(textColor, 0.06)
    ctx.fill()

    ctx.beginPath()
    ctx.arc(chartCenterX, dotY, TARGET_RADIUS, 0, Math.PI * 2)
    ctx.fillStyle = props.isSingingCorrectNote ? '#4ade80' : textColor
    ctx.fill()

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

  /* Singer's current pitch indicator. warm-up uses a forgiving 30¢ threshold
   * so small wobbles don't surface a distracting cents number; the label is
   * hidden when on target so it doesn't overlap the target label. */
  if (props.currentMidi !== null) {
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
      centsThreshold: 30,
    })
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

defineExpose({ gridNotes, gridNoteCount })
</script>

<template>
  <div
    ref="containerRef"
    class="relative my-4 max-h-120 min-h-64 w-full max-w-4xl flex-1 py-4"
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
