<script setup lang="ts">
import { TONE_CLICK_HIGHLIGHT_DURATION_MS } from '@/constants/toneConstants'
import type { NoteInfo, NoteName } from '@/utils/noteUtils'
import { midiToNoteLabel, noteToFrequency } from '@/utils/noteUtils'
import PitchHistoryCanvas from './PitchHistoryCanvas.vue'

type Props = {
  noteInfo: NoteInfo | null
  isListening: boolean
  isClean: boolean
  midiMin?: number
  midiMax?: number
  highlightedMidi?: number | null
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

const PADDING_TOP = 16
const PADDING_BOTTOM = 16

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

function handleMarkerClick(midiNote: number) {
  const { note, octave } = midiToNoteLabel(midiNote)
  playTone(noteToFrequency(note, octave))
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
</script>

<template>
  <div
    ref="containerRef"
    class="relative min-h-64 w-full max-w-4xl flex-1 overflow-hidden"
    style="max-height: 50rem"
  >
    <PitchHistoryCanvas
      :noteInfo="noteInfo"
      :isListening="isListening"
      :isClean="isClean"
      :midiMin="midiMin"
      :midiMax="midiMax"
      :gridMidis="gridMidis"
      @markerClick="handleMarkerClick"
    />
    <button
      v-for="pos in labelPositions"
      :key="pos.midi"
      :data-testid="`btn-${pos.label}`"
      class="absolute start-0 origin-center -translate-y-1/2 cursor-pointer border-none bg-transparent px-0 font-mono text-base transition-all duration-150"
      :class="
        activeMidi === pos.midi
          ? 'scale-110 text-yellow-400'
          : 'text-white/40 hover:text-white/80'
      "
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
  </div>
</template>

<style scoped></style>
