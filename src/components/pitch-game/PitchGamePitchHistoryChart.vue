<script setup lang="ts">
import {
  CHART_LABEL_ACTIVE,
  CHART_LABEL_BASE,
  CHART_LABEL_INACTIVE,
} from '@/constants/chartStyles'
import { TONE_CLICK_HIGHLIGHT_DURATION_MS } from '@/constants/toneConstants'
import { getAdaptiveGridDivisions } from '@/utils/chartGrid'
import type { NoteInfo, NoteName } from '@/utils/noteUtils'
import { midiToNoteLabel, noteToFrequency } from '@/utils/noteUtils'
import PitchGamePitchHistoryCanvas from './PitchGamePitchHistoryCanvas.vue'
import type { GameTarget } from './usePitchGame'

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
})

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

  // Ensure the top boundary note is always included
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

const gridMidis = computed(() => gridNotes.value.map((n) => n.midi))

const containerRef = ref<HTMLElement | null>(null)
const canvasComponentRef = ref<InstanceType<
  typeof PitchGamePitchHistoryCanvas
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
    <PitchGamePitchHistoryCanvas
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
      @markerClick="handleMarkerClick"
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
