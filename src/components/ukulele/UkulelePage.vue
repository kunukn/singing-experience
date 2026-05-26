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
} = usePitchDetection()

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
