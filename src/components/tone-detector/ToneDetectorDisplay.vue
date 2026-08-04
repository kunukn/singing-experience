<script setup lang="ts">
import type { ToneDetectionResult } from '@/components/tone-detector/toneDetectionTypes'
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
  <div
    class="flex flex-1 flex-col items-center gap-4 sm:gap-6"
    data-testid="tone-detector-display"
  >
    <p class="text-sm text-(--p-text-muted-color)">
      <span> {{ t('toneDetector.pageDescription') }}</span>
    </p>

    <p v-if="error" class="text-sm text-(--p-red-400)">{{ error }}</p>

    <slot />

    <div class="flex w-full items-center justify-center">
      <PrimeButton
        class="min-w-20"
        :severity="isListening ? 'danger' : 'success'"
        size="small"
        rounded
        @click="toggle"
      >
        {{ isListening ? t('generic.stop') : t('generic.start') }}
      </PrimeButton>
    </div>

    <div v-if="isListening" class="flex w-full flex-col items-center gap-4">
      <!-- min-height reserves stable space to prevent layout shift -->
      <div class="flex min-h-20 w-full items-center justify-center sm:min-h-24">
        <p
          v-if="detectedTones.length === 0"
          class="text-sm text-(--p-text-muted-color)"
        >
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
      </div>

      <p class="text-xs text-(--p-surface-500) tabular-nums">
        {{ t('toneDetector.tonesDetected', { count: detectedTones.length }) }}
      </p>
    </div>

    <div
      v-else
      class="flex flex-col items-center gap-2 text-(--p-text-muted-color)"
    >
      <span class="text-6xl">🎚️</span>
      <p class="text-sm">{{ t('toneDetector.pressStart') }}</p>
    </div>
  </div>
</template>
