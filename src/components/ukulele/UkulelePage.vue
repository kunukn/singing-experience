<script setup lang="ts">
import UkuleleDisplay from './UkuleleDisplay.vue'

const {
  frequency,
  noteInfo,
  clarity,
  isListening,
  isClean,
  error,
  start,
  stop,
  /* softRawAudio — NS/AGC fight a steady plucked-string tone, but echo
   * cancellation stays on because the ukulele sampler plays through the speaker
   * while the mic listens. */
} = usePitchDetection({ softRawAudio: true })

onUnmounted(() => {
  stop()
})
</script>

<template>
  <UkuleleDisplay
    :noteInfo="noteInfo"
    :frequency="frequency"
    :clarity="clarity"
    :isClean="isClean"
    :isListening="isListening"
    :error="error"
    :start="start"
    :stop="stop"
  />
</template>
