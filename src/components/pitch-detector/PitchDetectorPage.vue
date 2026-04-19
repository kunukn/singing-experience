<script setup lang="ts">
import type { ToneMode } from '@/composables/toneEngine'
import { useLocalStorage } from '@vueuse/core'
import PitchDetectorDisplay from './PitchDetectorDisplay.vue'

const VALID_TONE_MODES: ToneMode[] = ['piano', 'bell', 'bass', 'square']
const VOICE_RANGE_COUNT = 8

const { toneMode } = useTonePlayer()
const selectedToneMode = useLocalStorage<ToneMode>(
  'singing.pitchToneMode',
  toneMode.value,
)
if (!VALID_TONE_MODES.includes(selectedToneMode.value)) {
  selectedToneMode.value = toneMode.value
}

const DEFAULT_RANGE_INDEX = 4
const selectedRangeIndex = useLocalStorage(
  'singing.rangeIndex',
  DEFAULT_RANGE_INDEX,
)
if (
  typeof selectedRangeIndex.value !== 'number' ||
  !Number.isInteger(selectedRangeIndex.value) ||
  selectedRangeIndex.value < 0 ||
  selectedRangeIndex.value >= VOICE_RANGE_COUNT
) {
  selectedRangeIndex.value = DEFAULT_RANGE_INDEX
}

const detection = usePitchDetection()
</script>

<template>
  <PitchDetectorDisplay
    :detection="detection"
    v-model:rangeIndex="selectedRangeIndex"
    v-model:toneMode="selectedToneMode"
  />
</template>
