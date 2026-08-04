<script setup lang="ts">
import PitchDetectorDisplay from './PitchDetectorDisplay.vue'

const selectedRangeIndex = useVoiceRangeIndex('syng.rangeIndex')

/* softRawAudio — noise suppression / AGC gate sustained tones, but echo
 * cancellation stays on because reference/preview tones can play through the
 * speaker while the mic listens. */
const detection = usePitchDetection({ softRawAudio: true })
</script>

<template>
  <PitchDetectorDisplay
    :detection="detection"
    v-model:rangeIndex="selectedRangeIndex"
  />
</template>
