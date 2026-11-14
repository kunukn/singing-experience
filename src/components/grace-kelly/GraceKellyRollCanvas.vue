<script setup lang="ts">
import { midiToChartY } from '@/utils/chartGrid'
import { resolveCssColor } from '@/utils/cssColor'
import { midiToNoteLabel } from '@/utils/noteUtils'
import { voiceTypeColor } from '@/utils/pitchColors'
import { drawPitchLine } from '@/utils/pitchLineRenderer'
import {
  buildRollBlocks,
  buildRollToneLabels,
  eighthToRollX,
  ROLL_BAR_LINE_EIGHTHS,
  ROLL_COLUMNS,
  vozColorIndex,
} from './graceKellyRoll'

type Props = {
  /* Plot size in CSS px, measured by the parent so the axis labels and the
   * lyric strip share it. */
  width: number
  height: number
  midiMin: number
  midiMax: number
  gridMidis: number[]
  startToneMidi: number
  /* Voices to draw, by VOZ_MELODIES index. */
  vozIndices: number[]
  /* Timeline note being sung, or null when nothing plays. */
  activeNoteIndex: number | null
  /* Names the tones above the blocks, once per run of the same tone. */
  showToneLabels: boolean
  /* The singer's idle "See my voice" pitch: nearest note and its measured
   * frequency. Null when there is nothing to show. */
  previewMidi: number | null
  previewFrequency: number | null
  /* x in px of the preview line's dot and note name. */
  previewAnchorX: number
}

const props = defineProps<Props>()

const { isDark } = useDarkMode()
const { colorForCents } = usePitchPreviewColor()

/* Cents off the note before the preview line's name also shows the number.
 * Forgiving, like the Pitch Detector chart, so a small wobble shows none. */
const PREVIEW_CENTS_THRESHOLD = 20

const canvasRef = ref<HTMLCanvasElement | null>(null)

/* A block is one semitone tall, but never thinner than this, so it stays
 * visible on a short chart. */
const MIN_BLOCK_HEIGHT_PX = 6
/* px left free at a block's end, so repeated notes read as separate blocks. */
const BLOCK_GAP_PX = 2
const BLOCK_RADIUS_PX = 3

/* Tone names: small, so they fit between two parts a few semitones apart. */
const TONE_LABEL_FONT_SIZE_PX = 10
const TONE_LABEL_FONT_WEIGHT = 600
/* Space between a tone name and the top of its block. */
const TONE_LABEL_GAP_PX = 2
/* The name sits on a patch of the chart background, this much wider than the
 * text, so grid lines and neighbouring blocks do not cut through the letters. */
const TONE_LABEL_HALO_PADDING_PX = 1
const TONE_LABEL_HALO_OPACITY = 0.85
/* A stripe never gets thinner than this, however many voices share a pitch. */
const MIN_STRIPE_HEIGHT_PX = 2

const IDLE_BLOCK_OPACITY = 0.9
/* While playing, the notes being sung stay solid and the rest step back. */
const ACTIVE_BLOCK_OPACITY = 1
const INACTIVE_BLOCK_OPACITY = 0.4

const BAR_LINE_OPACITY = 0.5
const ACTIVE_BAND_OPACITY = 0.14
const PLAYHEAD_WIDTH_PX = 2

const blocks = computed(() =>
  buildRollBlocks(props.vozIndices, props.startToneMidi),
)

const toneLabels = computed(() => buildRollToneLabels(blocks.value))

function draw() {
  const canvas = canvasRef.value
  const context = canvas?.getContext('2d')
  if (!canvas || !context || props.width <= 0 || props.height <= 0) return

  const dpr = window.devicePixelRatio || 1
  const pixelWidth = Math.round(props.width * dpr)
  const pixelHeight = Math.round(props.height * dpr)
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth
    canvas.height = pixelHeight
  }

  context.setTransform(dpr, 0, 0, dpr, 0, 0)
  context.clearRect(0, 0, props.width, props.height)

  const scale = {
    midiMin: props.midiMin,
    midiMax: props.midiMax,
    height: props.height,
  }
  const borderColor = resolveCssColor('--p-content-border-color', '#888888')
  const primaryColor = resolveCssColor('--p-primary-color', '#888888')

  drawActiveBand(context, primaryColor)
  drawGrid(context, scale, borderColor)
  drawBlocks(context, scale)
  if (props.showToneLabels) drawToneLabels(context, scale)

  drawPlayhead(context, primaryColor)
  drawPreviewLine(context, scale)
}

/* The singer's own pitch as a dashed line across the chart, before the song
 * starts. No game is running then, so it is always coloured by cents. */
function drawPreviewLine(
  context: CanvasRenderingContext2D,
  scale: { midiMin: number; midiMax: number; height: number },
) {
  if (props.previewMidi === null || props.activeNoteIndex !== null) return

  drawPitchLine(context, {
    midi: props.previewMidi,
    frequency: props.previewFrequency,
    height: props.height,
    midiToY: (midi) => midiToChartY(midi, scale),
    lineX0: 0,
    lineX1: props.width,
    dotX: props.previewAnchorX,
    isDark: isDark.value,
    centsThreshold: PREVIEW_CENTS_THRESHOLD,
    colorForCents,
  })
}

/* Tinted column behind the notes being sung. */
function drawActiveBand(context: CanvasRenderingContext2D, color: string) {
  const column = activeColumn()
  if (!column) return

  const startX = eighthToRollX(column.startEighth, props.width)
  const endX = eighthToRollX(column.startEighth + column.eighths, props.width)

  context.globalAlpha = ACTIVE_BAND_OPACITY
  context.fillStyle = color
  context.fillRect(startX, 0, endX - startX, props.height)
  context.globalAlpha = 1
}

function drawGrid(
  context: CanvasRenderingContext2D,
  scale: { midiMin: number; midiMax: number; height: number },
  color: string,
) {
  context.strokeStyle = color
  context.lineWidth = 1

  context.beginPath()
  for (const midi of props.gridMidis) {
    /* Half-pixel offset keeps a 1px line crisp. */
    const y = Math.round(midiToChartY(midi, scale)) + 0.5
    context.moveTo(0, y)
    context.lineTo(props.width, y)
  }
  context.stroke()

  context.globalAlpha = BAR_LINE_OPACITY
  context.beginPath()
  for (const eighth of ROLL_BAR_LINE_EIGHTHS) {
    const x = Math.round(eighthToRollX(eighth, props.width)) + 0.5
    context.moveTo(x, 0)
    context.lineTo(x, props.height)
  }
  context.stroke()
  context.globalAlpha = 1
}

function drawBlocks(
  context: CanvasRenderingContext2D,
  scale: { midiMin: number; midiMax: number; height: number },
) {
  const rowHeight = rowHeightFor(scale)
  const activeIndex = props.activeNoteIndex

  for (const block of blocks.value) {
    const startX = eighthToRollX(block.startEighth, props.width)
    const endX = eighthToRollX(block.startEighth + block.eighths, props.width)
    const width = Math.max(BLOCK_GAP_PX, endX - startX - BLOCK_GAP_PX)

    const stripeHeight = Math.max(
      MIN_STRIPE_HEIGHT_PX,
      rowHeight / block.stripeCount,
    )
    const rowTop = midiToChartY(block.midi, scale) - rowHeight / 2
    const y = rowTop + block.stripeIndex * (rowHeight / block.stripeCount)

    const isActive =
      activeIndex !== null &&
      activeIndex >= block.firstNoteIndex &&
      activeIndex <= block.lastNoteIndex
    const opacity =
      activeIndex === null
        ? IDLE_BLOCK_OPACITY
        : isActive
          ? ACTIVE_BLOCK_OPACITY
          : INACTIVE_BLOCK_OPACITY

    context.fillStyle = voiceTypeColor(
      vozColorIndex(block.vozIndex),
      isDark.value,
      opacity,
    )
    context.beginPath()
    context.roundRect(
      startX,
      y,
      width,
      stripeHeight,
      Math.min(BLOCK_RADIUS_PX, stripeHeight / 2),
    )
    context.fill()
  }
}

/* Height of one tone's row: a semitone, but never thinner than a block may be. */
function rowHeightFor(scale: {
  midiMin: number
  midiMax: number
  height: number
}): number {
  const semitoneHeight =
    midiToChartY(props.midiMin, scale) - midiToChartY(props.midiMin + 1, scale)

  return Math.max(MIN_BLOCK_HEIGHT_PX, semitoneHeight)
}

/* Tone names in the part's own colour, just above where each tone starts. They
 * keep full strength while playing, when the blocks not being sung step back. */
function drawToneLabels(
  context: CanvasRenderingContext2D,
  scale: { midiMin: number; midiMax: number; height: number },
) {
  const canvas = canvasRef.value
  if (!canvas) return

  const rowHeight = rowHeightFor(scale)
  const haloColor = resolveCssColor('--p-content-background', '#ffffff')

  context.font = `${TONE_LABEL_FONT_WEIGHT} ${TONE_LABEL_FONT_SIZE_PX}px ${getComputedStyle(canvas).fontFamily}`
  context.textBaseline = 'bottom'
  context.textAlign = 'left'

  for (const label of toneLabels.value) {
    const text = midiToNoteLabel(label.midi).label
    const x = eighthToRollX(label.startEighth, props.width)
    const bottom =
      midiToChartY(label.midi, scale) - rowHeight / 2 - TONE_LABEL_GAP_PX
    const textWidth = context.measureText(text).width

    context.globalAlpha = TONE_LABEL_HALO_OPACITY
    context.fillStyle = haloColor
    context.fillRect(
      x - TONE_LABEL_HALO_PADDING_PX,
      bottom - TONE_LABEL_FONT_SIZE_PX,
      textWidth + TONE_LABEL_HALO_PADDING_PX * 2,
      TONE_LABEL_FONT_SIZE_PX,
    )
    context.globalAlpha = 1

    context.fillStyle = voiceTypeColor(
      vozColorIndex(label.vozIndex),
      isDark.value,
    )
    context.fillText(text, x, bottom)
  }
}

function drawPlayhead(context: CanvasRenderingContext2D, color: string) {
  const column = activeColumn()
  if (!column) return

  const x = eighthToRollX(column.startEighth, props.width)

  context.fillStyle = color
  context.fillRect(
    x - PLAYHEAD_WIDTH_PX / 2,
    0,
    PLAYHEAD_WIDTH_PX,
    props.height,
  )
}

function activeColumn() {
  if (props.activeNoteIndex === null) return null

  return ROLL_COLUMNS[props.activeNoteIndex] ?? null
}

/* Nothing moves between notes, so there is no animation loop: the roll is
 * redrawn only when what it shows changes, the idle preview pitch included. flush 'post' so the canvas exists
 * and a theme switch has reached the DOM before colours are read. */
watch(
  [
    () => props.width,
    () => props.height,
    () => props.midiMin,
    () => props.midiMax,
    () => props.gridMidis,
    () => props.activeNoteIndex,
    () => props.showToneLabels,
    () => props.previewMidi,
    () => props.previewFrequency,
    () => props.previewAnchorX,
    blocks,
    isDark,
  ],
  draw,
  { flush: 'post' },
)

onMounted(draw)
</script>

<template>
  <canvas
    ref="canvasRef"
    class="absolute inset-0 size-full"
    aria-hidden="true"
    data-testid="grace-kelly-roll-canvas"
    :data-active-note-index="activeNoteIndex ?? ''"
  />
</template>
