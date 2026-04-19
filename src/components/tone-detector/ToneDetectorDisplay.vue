<script setup lang="ts">
import type { ToneDetectionResult } from '@/composables/toneDetectionTypes'
import DetectedToneCard from './DetectedToneCard.vue'

type Props = {
  detection: ToneDetectionResult
}

const props = defineProps<Props>()
const { t } = useI18n()

const { detectedTones, isListening, error, start, stop } = props.detection

function toggle() {
  if (isListening.value) stop()
  else start()
}

onUnmounted(() => {
  stop()
})
</script>

<template>
  <div class="flex flex-1 flex-col items-center gap-4 sm:gap-6">
    <p class="text-sm text-gray-400">
      <Badge class="me-1">Beta</Badge>
      <span> {{ t('toneDetector.pageDescription') }}</span>
    </p>

    <p v-if="error" class="text-sm text-red-400">{{ error }}</p>

    <slot />

    <div class="flex w-full items-center justify-center">
      <Button
        class="min-w-27.5"
        :variant="isListening ? 'red' : 'green'"
        @click="toggle"
      >
        {{ isListening ? t('generic.stop') : t('generic.start') }}
      </Button>
    </div>

    <div v-if="isListening" class="flex w-full flex-col items-center gap-4">
      <p v-if="detectedTones.length === 0" class="text-sm text-gray-500">
        {{ t('toneDetector.listening') }}
      </p>

      <div
        v-else
        class="flex flex-wrap items-baseline justify-center gap-4 sm:gap-6"
      >
        <DetectedToneCard
          v-for="tone in detectedTones"
          :key="tone.midiNote"
          :note="tone.note"
          :octave="tone.octave"
          :midiNote="tone.midiNote"
          :frequency="tone.frequency"
          :isClean="tone.isClean"
        />
      </div>

      <p class="text-xs text-gray-600">
        {{ t('toneDetector.tonesDetected', { count: detectedTones.length }) }}
      </p>
    </div>

    <div v-else class="flex flex-col items-center gap-2 text-gray-500">
      <span class="text-6xl">🎹</span>
      <p class="text-sm">{{ t('toneDetector.pressStart') }}</p>
    </div>
  </div>
</template>
