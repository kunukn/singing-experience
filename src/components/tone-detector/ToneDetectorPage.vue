<script setup lang="ts">
import { textColorAtMidi } from '@/utils/pitchColors'

const { t } = useI18n()

const sensitivity = ref(5)
const noiseGate = ref(5)

const { detectedTones, isListening, error, start, stop } =
  useMultiToneDetection({ sensitivity, noiseGate })

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
      {{ t('toneDetector.pageDescription') }}
    </p>

    <p v-if="error" class="text-sm text-red-400">{{ error }}</p>

    <div class="flex w-full flex-col gap-8 rounded-lg bg-white/5 p-4">
      <div class="flex flex-col gap-1">
        <p class="text-xs leading-relaxed text-gray-400">
          {{ t('toneDetector.sensitivityDescription') }}
        </p>
        <label class="flex flex-col gap-1 text-sm text-gray-300">
          {{ t('toneDetector.sensitivity') }} ({{ sensitivity }})
          <input
            v-model.number="sensitivity"
            type="range"
            min="0"
            max="10"
            step="1"
            class="accent-blue-500"
          />
          <span class="flex justify-between text-xs text-gray-500">
            <span>{{ t('toneDetector.strict') }}</span>
            <span>{{ t('toneDetector.loose') }}</span>
          </span>
        </label>
      </div>

      <div class="flex flex-col gap-1">
        <p class="text-xs leading-relaxed text-gray-400">
          {{ t('toneDetector.noiseGateDescription') }}
        </p>
        <label class="flex flex-col gap-1 text-sm text-gray-300">
          {{ t('toneDetector.noiseGate') }} ({{ noiseGate }})
          <input
            v-model.number="noiseGate"
            type="range"
            min="0"
            max="10"
            step="1"
            class="accent-blue-500"
          />
          <span class="flex justify-between text-xs text-gray-500">
            <span>{{ t('toneDetector.quiet') }}</span>
            <span>{{ t('toneDetector.loud') }}</span>
          </span>
        </label>
      </div>
    </div>

    <div class="flex w-full items-center justify-center">
      <BasicButton
        class="min-w-27.5"
        :variant="isListening ? 'red' : 'green'"
        @click="toggle"
      >
        {{ isListening ? t('generic.stop') : t('generic.start') }}
      </BasicButton>
    </div>

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
