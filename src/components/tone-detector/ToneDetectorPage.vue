<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core'
import SettingsSlider from './SettingsSlider.vue'
import ToneDetectorDisplay from './ToneDetectorDisplay.vue'
import { useMultiToneDetection } from './useMultiToneDetection'

const { t } = useI18n()

const DEFAULT_VALUE = 5

function isValidSetting(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 10
  )
}

const sensitivity = useLocalStorage('singing.sensitivity', DEFAULT_VALUE)
const noiseGate = useLocalStorage('singing.noiseGate', DEFAULT_VALUE)

if (!isValidSetting(sensitivity.value)) sensitivity.value = DEFAULT_VALUE
if (!isValidSetting(noiseGate.value)) noiseGate.value = DEFAULT_VALUE

const detection = useMultiToneDetection({ sensitivity, noiseGate })
</script>

<template>
  <ToneDetectorDisplay :detection="detection">
    <div class="flex w-full flex-col gap-8 rounded-lg bg-white/5 p-4">
      <SettingsSlider
        v-model="sensitivity"
        :description="t('toneDetector.sensitivityDescription')"
        :label="t('toneDetector.sensitivity')"
        :minLabel="t('toneDetector.strict')"
        :maxLabel="t('toneDetector.loose')"
      />

      <SettingsSlider
        v-model="noiseGate"
        :description="t('toneDetector.noiseGateDescription')"
        :label="t('toneDetector.noiseGate')"
        :minLabel="t('toneDetector.quiet')"
        :maxLabel="t('toneDetector.loud')"
      />
    </div>
  </ToneDetectorDisplay>
</template>
