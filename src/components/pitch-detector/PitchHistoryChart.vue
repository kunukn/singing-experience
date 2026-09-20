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
}

const props = withDefaults(defineProps<Props>(), {
  laneDetections: () => [],
  previewLanes: () => [],
  midiMin: 36,
  midiMax: 84,
  highlightedMidi: null,
  replayProgress: null,
  rangeIndex: -1,
})

const isRtl = useIsRtl()
const { isDark } = useDarkMode()
const { isVoiceTypeRibbonVisible } = useVoiceTypeRibbon()

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
      @markerClick="handleMarkerClick"
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
