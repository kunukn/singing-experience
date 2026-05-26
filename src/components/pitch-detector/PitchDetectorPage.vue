<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core'
import { DEFAULT_RANGE_INDEX, VOICE_RANGES } from '@/constants/voiceRanges'
import PitchDetectorDisplay from './PitchDetectorDisplay.vue'

const selectedRangeIndex = useLocalStorage(
  'syng.rangeIndex',
  DEFAULT_RANGE_INDEX,
)
if (
  typeof selectedRangeIndex.value !== 'number' ||
  !Number.isInteger(selectedRangeIndex.value) ||
  selectedRangeIndex.value < 0 ||
  selectedRangeIndex.value >= VOICE_RANGES.length
) {
  selectedRangeIndex.value = DEFAULT_RANGE_INDEX
}

const detection = usePitchDetection()
</script>

<template>
  <PitchDetectorDisplay
    :detection="detection"
    v-model:rangeIndex="selectedRangeIndex"
  />
</template>
