<script setup lang="ts">
import { useEventListener, useResizeObserver } from '@vueuse/core'

import { getGridMidis } from '@/utils/chartGrid'
import { resolveCssColor, withAlpha } from '@/utils/cssColor'
import { midiToNoteLabel } from '@/utils/noteUtils'
import { directionalCleanColor } from '@/utils/pitchColors'

import type { TakeAnalysis } from './analyzeTake'
import {
  contentWidthFor,
  contentXToTime,
  pitchRangeForTake,
  scrollLeftToReveal,
  startScrollLeft,
  timeTickStepMs,
  timeToContentX,
  type TimeAxis,
} from './melodyMapGeometry'
import { frameIndexAt, frameTimeMs } from './pitchTrack'
import type { TakeNote } from './takeNotes'

const MAP_HEIGHT_PX = 280
/* Space for the time labels, kept clear of the lowest notes. */
const TIME_AXIS_HEIGHT_PX = 22
const PADDING_TOP_PX = 8
/* Enough for "C#4" at the label size without touching the first note. */
const NOTE_LABEL_WIDTH_PX = 34
/* Half a "10:00" label, so the first and last labels aren't cut off at the edge. */
const TIME_LABEL_HALF_WIDTH_PX = 14
const TIME_TICK_MARK_HEIGHT_PX = 4
const NOTE_FILL_OPACITY = 0.6
/* Blocks stay visible even in a wide range, where a semitone is only a few px. */
const MIN_NOTE_HEIGHT_PX = 4
const NOTE_CORNER_RADIUS_PX = 4
const LABEL_FONT = '11px system-ui, sans-serif'
const LABEL_HEIGHT_PX = 16
const LABEL_BACKING_OPACITY = 0.85

type Props = {
  analysis: TakeAnalysis
  playheadMs: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  seek: [timeMs: number]
}>()

const { t } = useI18n()
const isRtl = useIsRtl()
const { isDark } = useDarkMode()

const scrollerElement = useTemplateRef<HTMLDivElement>('scrollerElement')
const canvasElement = useTemplateRef<HTMLCanvasElement>('canvasElement')

const viewportWidth = ref(0)
const hover = shallowRef<{ note: TakeNote; x: number; y: number } | null>(null)

const contentWidth = computed(() =>
  contentWidthFor(props.analysis.durationMs, viewportWidth.value),
)
const timeAxis = computed<TimeAxis>(() => ({
  durationMs: props.analysis.durationMs,
  contentWidth: contentWidth.value,
  isRtl: isRtl.value,
}))
const pitchRange = computed(() =>
  pitchRangeForTake(
    props.analysis.notes.map((note) => note.midi),
    props.analysis.tunedMidi,
  ),
)

const hoverLabel = computed(() => {
  if (!hover.value) return ''

  const { note } = hover.value
  const cents = Math.round(note.centsFromGrid)
  const sign = cents > 0 ? '+' : ''

  return `${midiToNoteLabel(note.midi).label} ${sign}${cents}¢`
})

function midiToY(midi: number): number {
  const { midiMin, midiMax } = pitchRange.value
  const plotHeight = MAP_HEIGHT_PX - TIME_AXIS_HEIGHT_PX - PADDING_TOP_PX

  return (
    PADDING_TOP_PX + plotHeight * (1 - (midi - midiMin) / (midiMax - midiMin))
  )
}

function semitoneHeight(): number {
  return Math.abs(midiToY(1) - midiToY(0))
}

function formatTime(ms: number): string {
  const totalSeconds = Math.round(ms / 1000)
  const seconds = String(totalSeconds % 60).padStart(2, '0')

  return `${Math.floor(totalSeconds / 60)}:${seconds}`
}

let drawRequest: number | null = null

function requestDraw() {
  if (drawRequest !== null) return

  drawRequest = requestAnimationFrame(() => {
    drawRequest = null
    draw()
  })
}

function drawGrid(context: CanvasRenderingContext2D, width: number) {
  const { midiMin, midiMax } = pitchRange.value

  context.strokeStyle = resolveCssColor('--p-content-border-color', '#888888')
  context.lineWidth = 1

  for (const midi of getGridMidis(midiMin, midiMax, MAP_HEIGHT_PX)) {
    const y = midiToY(midi)

    context.beginPath()
    context.moveTo(0, y)
    context.lineTo(width, y)
    context.stroke()
  }
}

/* Drawn after the notes, on a backing, so a long note can't hide its own label. */
function drawNoteLabels(context: CanvasRenderingContext2D, width: number) {
  const { midiMin, midiMax } = pitchRange.value
  const labelColor = resolveCssColor('--p-text-muted-color', '#888888')
  const backing = withAlpha(
    resolveCssColor('--p-content-background', '#ffffff'),
    LABEL_BACKING_OPACITY,
  )
  const labelLeft = isRtl.value ? width - NOTE_LABEL_WIDTH_PX : 0

  context.font = LABEL_FONT
  context.textBaseline = 'middle'
  context.textAlign = 'center'

  for (const midi of getGridMidis(midiMin, midiMax, MAP_HEIGHT_PX)) {
    const y = Math.max(LABEL_HEIGHT_PX / 2, midiToY(midi))

    context.fillStyle = backing
    context.fillRect(
      labelLeft,
      y - LABEL_HEIGHT_PX / 2,
      NOTE_LABEL_WIDTH_PX,
      LABEL_HEIGHT_PX,
    )
    context.fillStyle = labelColor
    context.fillText(
      midiToNoteLabel(midi).label,
      labelLeft + NOTE_LABEL_WIDTH_PX / 2,
      y,
    )
  }
}

function drawTimeAxis(
  context: CanvasRenderingContext2D,
  scrollLeft: number,
  width: number,
) {
  const axis = timeAxis.value
  const axisTop = MAP_HEIGHT_PX - TIME_AXIS_HEIGHT_PX
  const labelY = axisTop + TIME_AXIS_HEIGHT_PX / 2 + 2
  const step = timeTickStepMs(axis)

  context.fillStyle = resolveCssColor('--p-text-muted-color', '#888888')
  context.strokeStyle = resolveCssColor('--p-content-border-color', '#888888')
  context.lineWidth = 1
  context.font = LABEL_FONT
  context.textBaseline = 'middle'
  context.textAlign = 'center'

  for (let timeMs = 0; timeMs <= axis.durationMs; timeMs += step) {
    const x = timeToContentX(timeMs, axis) - scrollLeft
    if (x < -TIME_LABEL_HALF_WIDTH_PX || x > width + TIME_LABEL_HALF_WIDTH_PX) {
      continue
    }

    context.beginPath()
    context.moveTo(x, axisTop)
    context.lineTo(x, axisTop + TIME_TICK_MARK_HEIGHT_PX)
    context.stroke()

    context.fillText(
      formatTime(timeMs),
      Math.max(
        TIME_LABEL_HALF_WIDTH_PX,
        Math.min(width - TIME_LABEL_HALF_WIDTH_PX, x),
      ),
      labelY,
    )
  }
}

function drawNotes(
  context: CanvasRenderingContext2D,
  scrollLeft: number,
  width: number,
) {
  const axis = timeAxis.value
  const height = Math.max(MIN_NOTE_HEIGHT_PX, semitoneHeight() - 2)

  for (const note of props.analysis.notes) {
    const startX = timeToContentX(note.startMs, axis) - scrollLeft
    const endX = timeToContentX(note.endMs, axis) - scrollLeft
    const left = Math.min(startX, endX)
    const right = Math.max(startX, endX)
    if (right < 0 || left > width) continue

    context.fillStyle = directionalCleanColor(
      note.centsFromGrid,
      NOTE_FILL_OPACITY,
    )
    context.beginPath()
    context.roundRect(
      left,
      midiToY(note.midi) - height / 2,
      Math.max(2, right - left),
      height,
      NOTE_CORNER_RADIUS_PX,
    )
    context.fill()
  }
}

function drawPitchLine(
  context: CanvasRenderingContext2D,
  scrollLeft: number,
  width: number,
) {
  const { track, tunedMidi } = props.analysis
  const axis = timeAxis.value
  const firstTime = contentXToTime(scrollLeft, axis)
  const lastTime = contentXToTime(scrollLeft + width, axis)
  const from = Math.max(
    0,
    frameIndexAt(track, Math.min(firstTime, lastTime)) - 1,
  )
  const to = Math.min(
    track.frameCount - 1,
    frameIndexAt(track, Math.max(firstTime, lastTime)) + 1,
  )

  context.strokeStyle = resolveCssColor('--p-text-color', '#888888')
  context.lineWidth = 1.5
  context.lineJoin = 'round'
  context.beginPath()

  let isDrawing = false
  for (let frame = from; frame <= to; frame++) {
    const midi = tunedMidi[frame]
    if (Number.isNaN(midi)) {
      isDrawing = false
      continue
    }

    const x = timeToContentX(frameTimeMs(track, frame), axis) - scrollLeft
    const y = midiToY(midi)
    if (isDrawing) {
      context.lineTo(x, y)
    } else {
      context.moveTo(x, y)
      isDrawing = true
    }
  }

  context.stroke()
}

function drawPlayhead(
  context: CanvasRenderingContext2D,
  scrollLeft: number,
  width: number,
) {
  const x = timeToContentX(props.playheadMs, timeAxis.value) - scrollLeft
  if (x < 0 || x > width) return

  context.strokeStyle = resolveCssColor('--p-primary-color', '#888888')
  context.lineWidth = 2
  context.beginPath()
  context.moveTo(x, 0)
  context.lineTo(x, MAP_HEIGHT_PX - TIME_AXIS_HEIGHT_PX)
  context.stroke()
}

function draw() {
  const canvas = canvasElement.value
  const scroller = scrollerElement.value
  const context = canvas?.getContext('2d')
  if (!canvas || !scroller || !context) return

  const width = viewportWidth.value
  const dpr = window.devicePixelRatio || 1
  const pixelWidth = Math.round(width * dpr)
  const pixelHeight = Math.round(MAP_HEIGHT_PX * dpr)

  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth
    canvas.height = pixelHeight
  }

  context.setTransform(dpr, 0, 0, dpr, 0, 0)
  context.clearRect(0, 0, width, MAP_HEIGHT_PX)

  const { scrollLeft } = scroller

  drawGrid(context, width)

  /* A rare reading outside the range stops at the plot's edge, so it can never
   * run through the time labels. */
  context.save()
  context.beginPath()
  context.rect(0, 0, width, MAP_HEIGHT_PX - TIME_AXIS_HEIGHT_PX)
  context.clip()
  drawNotes(context, scrollLeft, width)
  drawPitchLine(context, scrollLeft, width)
  context.restore()

  drawTimeAxis(context, scrollLeft, width)
  drawPlayhead(context, scrollLeft, width)
  drawNoteLabels(context, width)
}

function pointerToContentX(event: MouseEvent): number {
  const scroller = scrollerElement.value!
  const bounds = scroller.getBoundingClientRect()

  return event.clientX - bounds.left + scroller.scrollLeft
}

function handleClick(event: MouseEvent) {
  emit('seek', contentXToTime(pointerToContentX(event), timeAxis.value))
}

function handlePointerMove(event: PointerEvent) {
  const scroller = scrollerElement.value
  if (!scroller || event.pointerType === 'touch') return

  const timeMs = contentXToTime(pointerToContentX(event), timeAxis.value)
  const bounds = scroller.getBoundingClientRect()
  const y = event.clientY - bounds.top
  const halfRow = Math.max(MIN_NOTE_HEIGHT_PX, semitoneHeight()) / 2
  const note = props.analysis.notes.find(
    (candidate) =>
      timeMs >= candidate.startMs &&
      timeMs <= candidate.endMs &&
      Math.abs(midiToY(candidate.midi) - y) <= halfRow,
  )

  hover.value = note ? { note, x: event.clientX - bounds.left, y } : null
}

useResizeObserver(scrollerElement, ([entry]) => {
  viewportWidth.value = entry.contentRect.width
  requestDraw()
})

useEventListener(scrollerElement, 'scroll', requestDraw, { passive: true })

onMounted(() => {
  const scroller = scrollerElement.value
  if (!scroller) return

  viewportWidth.value = scroller.clientWidth
  nextTick(() => {
    scroller.scrollLeft = startScrollLeft(
      contentWidth.value,
      viewportWidth.value,
      isRtl.value,
    )
    requestDraw()
  })
})

onBeforeUnmount(() => {
  if (drawRequest !== null) cancelAnimationFrame(drawRequest)
})

watch(
  () => props.playheadMs,
  (playheadMs) => {
    const scroller = scrollerElement.value
    if (scroller) {
      const target = scrollLeftToReveal(
        timeToContentX(playheadMs, timeAxis.value),
        scroller.scrollLeft,
        viewportWidth.value,
        isRtl.value,
      )
      if (target !== null) scroller.scrollLeft = target
    }

    requestDraw()
  },
)

watch([() => props.analysis, isRtl, isDark], requestDraw)
</script>

<template>
  <div class="relative" data-testid="melody-map">
    <div
      ref="scrollerElement"
      dir="ltr"
      tabindex="0"
      role="img"
      :aria-label="t('voiceRecorder.melody.ariaLabel')"
      class="cursor-pointer overflow-x-auto overflow-y-hidden rounded-lg border border-(--p-content-border-color) bg-(--p-content-background)"
      @click="handleClick"
      @pointermove="handlePointerMove"
      @pointerleave="hover = null"
    >
      <div
        :style="{ width: `${contentWidth}px`, height: `${MAP_HEIGHT_PX}px` }"
      >
        <canvas
          ref="canvasElement"
          class="sticky start-0 block"
          :style="{ width: `${viewportWidth}px`, height: `${MAP_HEIGHT_PX}px` }"
        />
      </div>
    </div>
    <div
      v-if="hover"
      dir="ltr"
      class="pointer-events-none absolute z-10 rounded bg-(--p-content-background) px-2 py-1 text-xs whitespace-nowrap text-(--p-text-color) shadow-md"
      :style="{ left: `${hover.x + 8}px`, top: `${hover.y - 30}px` }"
      data-testid="melody-map-tooltip"
    >
      {{ hoverLabel }}
    </div>
  </div>
</template>
