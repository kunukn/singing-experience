<script setup lang="ts">
import {
  CHART_LABEL_ACTIVE,
  CHART_LABEL_BASE,
  CHART_LABEL_INACTIVE,
} from '@/constants/chartStyles'
import { TONE_CLICK_HIGHLIGHT_DURATION_MS } from '@/constants/toneConstants'
import { getGridMidis } from '@/utils/chartGrid'
import type { NoteInfo, NoteName } from '@/utils/noteUtils'
import { midiToNoteLabel, noteToFrequency } from '@/utils/noteUtils'
import { HISTORY_WINDOW_MS } from './noteRushConstants'
import NoteRushPitchHistoryCanvas from './NoteRushPitchHistoryCanvas.vue'
import type { GameTarget } from './useNoteRush'

type Props = {
  noteInfo: NoteInfo | null
  isListening: boolean
  isClean: boolean
  midiMin?: number
  midiMax?: number
  highlightedMidi?: number | null
  replayProgress?: number | null
  previewMidi?: number | null
  previewNoteLabel?: string | null
  previewFrequency?: number | null
  targets?: GameTarget[]
  simplifyChart?: boolean
  /* A finished round is on the chart, so it can be scrolled back through */
  isReviewable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  midiMin: 36,
  midiMax: 84,
  highlightedMidi: null,
  replayProgress: null,
  previewMidi: null,
  previewNoteLabel: null,
  previewFrequency: null,
  targets: () => [],
  simplifyChart: false,
  isReviewable: false,
})

const { t } = useI18n()
const isRtl = useIsRtl()

type GridNote = {
  midi: number
  label: string
  note: NoteName
  octave: number
}

const PADDING_TOP = 16
const PADDING_BOTTOM = 16

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
 * Build grid reference notes at even intervals from midiMin.
 * The step is adaptive: ~5 grid lines by default, ~9 at ≥ MEDIUM,
 * or ~13 at ≥ TALL (showing every semitone for small ranges like C3–C4).
 */
const gridNotes = computed<GridNote[]>(() => {
  const notes: GridNote[] = getGridMidis(
    props.midiMin,
    props.midiMax,
    containerHeight.value,
  ).map((midi) => {
    const info = midiToNoteLabel(midi)

    return { midi, label: info.label, note: info.note, octave: info.octave }
  })

  return notes
})

const gridMidis = computed(() => gridNotes.value.map((n) => n.midi))

const containerRef = ref<HTMLElement | null>(null)
const canvasComponentRef = ref<InstanceType<
  typeof NoteRushPitchHistoryCanvas
> | null>(null)
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

/* Scrolling back through a finished round to see every target, hit or
 * missed — see useHistoryScroller */
const {
  scrollerRef,
  viewOffsetMs,
  isScrollable,
  scrollSpacerWidthPx,
  scrollThumb,
  handleTimeScaleChange,
  handleScroll,
  handlePointerDown,
  handlePointerMove,
  handlePointerEnd,
} = useHistoryScroller({
  containerRef,
  isRtl,
  isEnabled: () => props.isReviewable,
  windowMs: HISTORY_WINDOW_MS,
})

const gridNoteCount = computed(() => gridNotes.value.length)

function getSamples() {
  return canvasComponentRef.value?.getSamples() ?? []
}

function getTargetViewportOrigin(id: number) {
  return canvasComponentRef.value?.getTargetViewportOrigin(id) ?? null
}

defineExpose({ gridNoteCount, getSamples, getTargetViewportOrigin })
</script>

<template>
  <div
    ref="containerRef"
    class="relative min-h-64 w-full max-w-4xl flex-1 overflow-hidden"
    style="max-height: 50rem"
  >
    <NoteRushPitchHistoryCanvas
      ref="canvasComponentRef"
      :noteInfo="noteInfo"
      :isListening="isListening"
      :isClean="isClean"
      :midiMin="midiMin"
      :midiMax="midiMax"
      :gridMidis="gridMidis"
      :activeMidi="activeMidi"
      :replayProgress="replayProgress"
      :previewMidi="props.previewMidi"
      :previewNoteLabel="props.previewNoteLabel"
      :previewFrequency="props.previewFrequency"
      :targets="props.targets"
      :simplifyChart="props.simplifyChart"
      :isRtl="isRtl"
      :viewOffsetMs="viewOffsetMs"
      @markerClick="handleMarkerClick"
      @timeScaleChange="handleTimeScaleChange"
    />
    <!-- Native scroller over the canvas once a finished round is longer than
         the window. Invisible, and under the note labels so those stay
         clickable. Always LTR: the RTL mapping lives in pitchHistoryScroll.
         touch-manipulation, not pan-x, so a vertical swipe on the chart still
         scrolls the page. -->
    <div
      v-if="isScrollable"
      ref="scrollerRef"
      class="absolute inset-0 cursor-grab touch-manipulation [scrollbar-width:none] overflow-x-auto overflow-y-hidden overscroll-x-contain rounded-lg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--p-primary-color) active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
      dir="ltr"
      role="region"
      tabindex="0"
      :aria-label="t('generic.scrollGame')"
      data-testid="note-rush-history-scroller"
      :data-view-offset-ms="Math.round(viewOffsetMs)"
      @scroll="handleScroll"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerEnd"
      @pointercancel="handlePointerEnd"
    >
      <div class="h-full" :style="{ width: `${scrollSpacerWidthPx}px` }" />
    </div>
    <!-- Where the view sits in the round — shows there is more to scroll to,
         since the scroller itself is invisible -->
    <div
      v-if="scrollThumb"
      class="pointer-events-none absolute bottom-1 h-1 rounded-full bg-(--p-surface-400)/70 dark:bg-(--p-surface-500)/70"
      :style="{
        insetInlineStart: `${scrollThumb.startFraction * 100}%`,
        width: `${scrollThumb.sizeFraction * 100}%`,
      }"
      aria-hidden="true"
      data-testid="note-rush-history-scroll-thumb"
    />
    <button
      v-for="pos in labelPositions"
      :key="pos.midi"
      :data-testid="`btn-${pos.label}`"
      :class="[
        CHART_LABEL_BASE,
        activeMidi === pos.midi ? CHART_LABEL_ACTIVE : CHART_LABEL_INACTIVE,
      ]"
      :style="{
        top: `${pos.y}px`,
        width: '36px',
        textAlign: 'end',
      }"
      :title="`Play ${pos.label}`"
      @click="handleLabelClick(pos.note, pos.octave, pos.midi)"
    >
      {{ pos.label }}
    </button>
  </div>
</template>

<style scoped lang="css"></style>
