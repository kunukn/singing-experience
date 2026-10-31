<script setup lang="ts">
import VoiceRangeFinderDisplay from './VoiceRangeFinderDisplay.vue'

/* Spike rejection keeps a crack at the top of the voice from being held as a
 * new highest note. */
const detection = usePitchDetection({ softRawAudio: true, rejectSpikes: true })
</script>

<template>
  <div class="flex flex-1 flex-col items-center gap-4">
    <VoiceRangeFinderDisplay :detection="detection" />
  </div>
</template>
