<script setup lang="ts">
import PitchDetectorDisplay from './PitchDetectorDisplay.vue'

const selectedRangeIndex = useVoiceRangeIndex('syng.rangeIndex')

/* softRawAudio — noise suppression / AGC gate sustained tones, but echo
 * cancellation stays on because reference/preview tones can play through the
 * speaker while the mic listens. With noise suppression off, background noise
 * reaches the detector, so rejectSpikes keeps its stray frames off the chart. */
const detection = usePitchDetection({ softRawAudio: true, rejectSpikes: true })
</script>

<template>
  <PitchDetectorDisplay
    :detection="detection"
    v-model:rangeIndex="selectedRangeIndex"
  />
</template>
