<script setup lang="ts">
import ScaleDetectorDisplay from './ScaleDetectorDisplay.vue'

/* Echo cancellation stays on, so piano keys played here aren't heard back. */
const detection = usePitchDetection({ softRawAudio: true })
</script>

<template>
  <ScaleDetectorDisplay :detection="detection" />
</template>
