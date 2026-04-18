<script setup lang="ts">
import { textColorAtMidi } from '@/utils/pitchColors'

const { t } = useI18n()

const { detectedTones, isListening, error, start, stop } =
  useMultiToneDetection()

function toggle() {
  if (isListening.value) stop()
  else start()
}

onUnmounted(() => {
  stop()
})
</script>

<template>
  <div class="flex flex-1 flex-col items-center gap-6">
    <div class="flex w-full items-center justify-end">
      <BasicButton
        class="min-w-27.5"
        :variant="isListening ? 'red' : 'green'"
        @click="toggle"
      >
        {{ isListening ? t('generic.stop') : t('generic.start') }}
      </BasicButton>
    </div>

    <p v-if="error" class="text-sm text-red-400">{{ error }}</p>

    <div v-if="isListening" class="flex w-full flex-col items-center gap-4">
      <p v-if="detectedTones.length === 0" class="text-sm text-gray-500">
        {{ t('toneDetector.listening') }}
      </p>

      <div
        v-else
        class="flex flex-wrap items-baseline justify-center gap-4 sm:gap-6"
      >
        <div
          v-for="tone in detectedTones"
          :key="tone.midiNote"
          class="flex flex-col items-center transition-colors duration-150"
          :style="{ color: textColorAtMidi(tone.midiNote) }"
        >
          <div>
            <span class="text-5xl font-bold tracking-tight sm:text-7xl">
              {{ tone.note }}
            </span>
            <span
              class="mt-1 inline-block align-top text-2xl font-light sm:text-4xl"
            >
              {{ tone.octave }}
            </span>
          </div>
          <span class="mt-1 text-xs text-gray-400 tabular-nums">
            {{ Math.round(tone.frequency) }}
            {{ t('toneDetector.hz') }}
          </span>
        </div>
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
