<script setup lang="ts">
import {
  CHART_LABEL_ACTIVE,
  CHART_LABEL_BASE,
  CHART_LABEL_GUTTER_WIDTH,
  CHART_LABEL_WIDTH,
} from '@/constants/chartStyles'
import { TONE_CLICK_HIGHLIGHT_DURATION_MS } from '@/constants/toneConstants'
import { getGridMidis, midiToChartY } from '@/utils/chartGrid'
import type { NoteName } from '@/utils/noteUtils'
import { midiToNoteLabel, noteToFrequency } from '@/utils/noteUtils'
import { textColorAtMidi } from '@/utils/pitchColors'
import { getRibbonWidth, getSegmentsForRange } from '@/utils/voiceRangeSegments'
import PitchHistoryCanvas from './PitchHistoryCanvas.vue'
import {
  getScrollThumb,
  offsetMsToScrollLeft,
  scrollLeftToOffsetMs,
  type PitchHistoryTimeScale,
} from './pitchHistoryScroll'
import type { PitchSample } from './pitchLaneRecorder'
import type {
  PitchLaneDetection,
  PitchLaneId,
  PitchPreviewLane,
} from './pitchLanes'

type Props = {
  /* One entry per singing voice — one in single-voice mode, two in duet. */
  laneDetections?: PitchLaneDetection[]
  previewLanes?: PitchPreviewLane[]
  isListening: boolean
  midiMin?: number
  midiMax?: number
  highlightedMidi?: number | null
  replayProgress?: number | null
  /* Index into VOICE_RANGES — picks which voices the ribbon draws, and marks
   * the chosen one when the range is itself a voice type. -1 means no range. */
  rangeIndex?: number
  /* See PitchHistoryCanvas — measures cents against this tone, not the nearest one */
  focusMidi?: number | null
  /* The focus tab spans three semitones, too narrow for voice types to mean anything */
  isVoiceRibbonAllowed?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  laneDetections: () => [],
  previewLanes: () => [],
  midiMin: 36,
  midiMax: 84,
  highlightedMidi: null,
  replayProgress: null,
  rangeIndex: -1,
  focusMidi: null,
  isVoiceRibbonAllowed: true,
})

const { t } = useI18n()
const isRtl = useIsRtl()
const { isDark } = useDarkMode()
const { isVoiceTypeRibbonVisible: isVoiceTypeRibbonEnabled } =
  useVoiceTypeRibbon()
const isVoiceTypeRibbonVisible = computed(
  () => props.isVoiceRibbonAllowed && isVoiceTypeRibbonEnabled.value,
)

type GridNote = {
  midi: number
  label: string
  note: NoteName
  octave: number
}

const { playTone } = useTonePlayer()

const emit = defineEmits<{
  tonePlayed: []
}>()

const clickedMidi = ref<number | null>(null)
let clickedTimer: ReturnType<typeof setTimeout> | null = null

function handleLabelClick(note: NoteName, octave: number, midi: number) {
  debugLog(`[PitchChart] click ${note}${octave} (midi=${midi})`)
  if (clickedTimer) clearTimeout(clickedTimer)

  clickedMidi.value = midi
  playTone(noteToFrequency(note, octave))
  emit('tonePlayed')

  clickedTimer = setTimeout(() => {
    clickedMidi.value = null
    clickedTimer = null
  }, TONE_CLICK_HIGHLIGHT_DURATION_MS)
}

function handleMarkerClick(midiNote: number) {
  const { note, octave } = midiToNoteLabel(midiNote)
  playTone(noteToFrequency(note, octave))
  emit('tonePlayed')
}

const activeMidi = computed(() => props.highlightedMidi ?? clickedMidi.value)

/*
 * Grid reference notes at even intervals from midiMin. The step is adaptive:
 * ~5 grid lines by default, ~9 at ≥ MEDIUM, or ~13 at ≥ TALL (showing every
 * semitone for small ranges like C3–C4).
 */
const gridNotes = computed<GridNote[]>(() =>
  getGridMidis(props.midiMin, props.midiMax, containerHeight.value).map(
    (midi) => {
      const info = midiToNoteLabel(midi)

      return { midi, label: info.label, note: info.note, octave: info.octave }
    },
  ),
)

const gridMidis = computed(() => gridNotes.value.map((n) => n.midi))

const containerRef = ref<HTMLElement | null>(null)
const canvasComponentRef = ref<InstanceType<typeof PitchHistoryCanvas> | null>(
  null,
)
const containerHeight = ref(0)

const labelPositions = computed(() => {
  if (!containerHeight.value) return []

  return gridNotes.value.map((n) => {
    const y = midiToChartY(n.midi, {
      midiMin: props.midiMin,
      midiMax: props.midiMax,
      height: containerHeight.value,
    })

    return Object.assign({}, n, { y })
  })
})

/*
 * The ribbon widens the start gutter only while it is on screen, so with the
 * setting off the plot keeps every pixel it had before the ribbon existed.
 */
const ribbonWidth = computed(() => {
  if (!isVoiceTypeRibbonVisible.value) return 0

  return getRibbonWidth(
    getSegmentsForRange(props.rangeIndex, props.midiMin, props.midiMax).length,
  )
})

const gutterWidth = computed(() => CHART_LABEL_GUTTER_WIDTH + ribbonWidth.value)

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
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
})

/*
 * Scrolling back through a stopped take. The canvas shows a 5 s window but
 * keeps 30 s, so a long take's start would otherwise be out of reach. Native
 * scrolling, as in SingTheKeysLane: an invisible scroller over the canvas
 * gives touch momentum, trackpad, shift-wheel and arrow keys, and its
 * scrollLeft drives viewOffsetMs, which the canvas draws from.
 */
const timeScale = ref<PitchHistoryTimeScale>({ pxPerMs: 0, scrollableMs: 0 })
const viewOffsetMs = ref(0)
const scrollerRef = ref<HTMLElement | null>(null)

const isScrollable = computed(
  () =>
    !props.isListening &&
    props.replayProgress == null &&
    timeScale.value.scrollableMs > 0 &&
    timeScale.value.pxPerMs > 0,
)

const scrollGeometry = computed(() => ({
  ...timeScale.value,
  isRtl: isRtl.value,
}))

/* Wide enough that the scroll range is exactly the extra history, at the
 * canvas's own scale, so the trail tracks the finger 1:1 */
const scrollSpacerWidthPx = computed(
  () =>
    (containerRef.value?.clientWidth ?? 0) +
    timeScale.value.scrollableMs * timeScale.value.pxPerMs,
)

const scrollThumb = computed(() =>
  isScrollable.value
    ? getScrollThumb(viewOffsetMs.value, timeScale.value.scrollableMs)
    : null,
)

function handleTimeScaleChange(next: PitchHistoryTimeScale) {
  /* A new take, or a cleared one, opens at its newest moment */
  if (next.scrollableMs !== timeScale.value.scrollableMs) viewOffsetMs.value = 0
  timeScale.value = next
}

function handleScroll() {
  const element = scrollerRef.value
  if (!element) return

  viewOffsetMs.value = scrollLeftToOffsetMs(
    element.scrollLeft,
    scrollGeometry.value,
  )
}

/* Puts the scroller where viewOffsetMs says — on mount (newest view after
 * Stop), after a resize changes the scale, and after replay hands it back */
watch([scrollerRef, scrollSpacerWidthPx, scrollGeometry], async ([element]) => {
  if (!element) return

  /* The spacer's new width must be laid out before scrollLeft can reach it */
  await nextTick()
  const target = offsetMsToScrollLeft(viewOffsetMs.value, scrollGeometry.value)
  /* 1 px slack: setting scrollLeft fires a scroll event, and sub-pixel
   * rounding would otherwise bounce the two back and forth */
  if (Math.abs(element.scrollLeft - target) > 1) element.scrollLeft = target
})

/* px — how far a mouse may move before a press becomes a drag, so a slightly
 * wobbly click on a marker still plays its note (same as useLaneScroll) */
const DRAG_THRESHOLD_PX = 6

/*
 * Mouse drag-to-scroll. A native scroller pans under touch and trackpad but
 * not under a mouse drag, and a plain wheel scrolls vertically, so a mouse
 * user would otherwise have no obvious way to scroll. Touch and pen are left
 * to the browser.
 */
let dragPointerId: number | null = null
let dragLastX = 0
let dragTravelPx = 0
let wasDragged = false

function handleScrollerPointerDown(event: PointerEvent) {
  if (event.pointerType !== 'mouse' || event.button !== 0) return

  dragPointerId = event.pointerId
  dragLastX = event.clientX
  dragTravelPx = 0
  wasDragged = false
}

function handleScrollerPointerMove(event: PointerEvent) {
  const element = scrollerRef.value
  if (event.pointerId !== dragPointerId || !element) return

  const deltaX = event.clientX - dragLastX
  dragLastX = event.clientX
  dragTravelPx += Math.abs(deltaX)
  if (!wasDragged && dragTravelPx < DRAG_THRESHOLD_PX) return

  if (!wasDragged) element.setPointerCapture?.(event.pointerId)
  wasDragged = true
  element.scrollLeft -= deltaX
}

function handleScrollerPointerEnd(event: PointerEvent) {
  if (event.pointerId === dragPointerId) dragPointerId = null
}

/* The scroller covers the canvas, so marker taps arrive here and are passed
 * on in canvas coordinates. A click that ends a mouse drag is not a tap. */
function handleScrollerClick(event: MouseEvent) {
  if (wasDragged) {
    wasDragged = false

    return
  }

  const rect = containerRef.value?.getBoundingClientRect()
  if (!rect) return

  canvasComponentRef.value?.handlePointerAt(
    event.clientX - rect.left,
    event.clientY - rect.top,
  )
}

const gridNoteCount = computed(() => gridNotes.value.length)

function getSamples(): Record<PitchLaneId, PitchSample[]> {
  return canvasComponentRef.value?.getSamples() ?? { low: [], high: [] }
}

function clearSamples() {
  canvasComponentRef.value?.clearSamples()
}

defineExpose({ gridNoteCount, getSamples, clearSamples })
</script>

<template>
  <div
    ref="containerRef"
    class="relative min-h-64 w-full max-w-4xl flex-1 overflow-hidden"
    style="max-height: 50rem"
  >
    <PitchHistoryCanvas
      ref="canvasComponentRef"
      :laneDetections="props.laneDetections"
      :previewLanes="props.previewLanes"
      :isListening="isListening"
      :midiMin="midiMin"
      :midiMax="midiMax"
      :gridMidis="gridMidis"
      :activeMidi="activeMidi"
      :replayProgress="replayProgress"
      :isRtl="isRtl"
      :gutterWidth="gutterWidth"
      :focusMidi="focusMidi"
      :viewOffsetMs="viewOffsetMs"
      @markerClick="handleMarkerClick"
      @timeScaleChange="handleTimeScaleChange"
    />
    <!-- Native scroller over the canvas while a stopped take is longer than
         the window (see scrollSpacerWidthPx). Invisible, and under the ribbon
         and the note labels so those stay clickable. Always LTR: the RTL
         mapping lives in pitchHistoryScroll. touch-manipulation, not pan-x,
         so a vertical swipe on the chart still scrolls the page. -->
    <div
      v-if="isScrollable"
      ref="scrollerRef"
      class="absolute inset-0 cursor-grab touch-manipulation [scrollbar-width:none] overflow-x-auto overflow-y-hidden overscroll-x-contain rounded-lg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--p-primary-color) active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
      dir="ltr"
      role="region"
      tabindex="0"
      :aria-label="t('pitchDetector.scrollHistory')"
      data-testid="pitch-history-scroller"
      :data-view-offset-ms="Math.round(viewOffsetMs)"
      @scroll="handleScroll"
      @pointerdown="handleScrollerPointerDown"
      @pointermove="handleScrollerPointerMove"
      @pointerup="handleScrollerPointerEnd"
      @pointercancel="handleScrollerPointerEnd"
      @click="handleScrollerClick"
    >
      <div class="h-full" :style="{ width: `${scrollSpacerWidthPx}px` }" />
    </div>
    <!-- Where the view sits in the take — shows there is more to scroll to,
         since the scroller itself is invisible -->
    <div
      v-if="scrollThumb"
      class="pointer-events-none absolute bottom-1 h-1 rounded-full bg-(--p-surface-400)/70 dark:bg-(--p-surface-500)/70"
      :style="{
        insetInlineStart: `${scrollThumb.startFraction * 100}%`,
        width: `${scrollThumb.sizeFraction * 100}%`,
      }"
      aria-hidden="true"
      data-testid="pitch-history-scroll-thumb"
    />
    <VoiceRangeRibbon
      v-if="isVoiceTypeRibbonVisible"
      :midiMin="midiMin"
      :midiMax="midiMax"
      :rangeIndex="rangeIndex"
      :containerHeight="containerHeight"
      :insetStart="CHART_LABEL_GUTTER_WIDTH"
    />
    <button
      v-for="pos in labelPositions"
      :key="pos.midi"
      :data-testid="`btn-${pos.label}`"
      :class="[
        CHART_LABEL_BASE,
        activeMidi === pos.midi ? CHART_LABEL_ACTIVE : 'chart-label-tinted',
      ]"
      :style="{
        top: `${pos.y}px`,
        width: `${CHART_LABEL_WIDTH}px`,
        textAlign: 'end',
        '--label-tint': textColorAtMidi(pos.midi, isDark),
      }"
      :title="`Play ${pos.label}`"
      @click="handleLabelClick(pos.note, pos.octave, pos.midi)"
    >
      {{ pos.label }}
    </button>
  </div>
</template>

<style scoped lang="css">
/*
 * The tint arrives as an inline custom property rather than an inline colour,
 * so the hover rule below can still win — an inline `color` would outrank any
 * class and the labels would lose their hover feedback.
 */
.chart-label-tinted {
  color: var(--label-tint);
}

.chart-label-tinted:hover {
  color: var(--p-text-color);
}
</style>
