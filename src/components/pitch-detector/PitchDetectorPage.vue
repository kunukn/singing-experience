<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core'
import PitchDetectorDisplay from './PitchDetectorDisplay.vue'

const VOICE_RANGE_COUNT = 8

const { toneMode: selectedToneMode } = useToneModeStore()

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
