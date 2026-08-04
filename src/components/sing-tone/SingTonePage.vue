<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core'
import {
  DEFAULT_HOLD_DURATION_MS,
  DEFAULT_TOTAL_ROUNDS,
  useSingTone,
} from './useSingTone'

const holdDurationOptions = [0.1, 0.3, 0.5, 1, 2, 3, 4, 5, 6, 7, 10]
const ROUNDS_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

const defaultDurationSec = DEFAULT_HOLD_DURATION_MS / 1000
const selectedDurationSec = useLocalStorage(
  'syng.singToneDurationSec',
  defaultDurationSec,
)
if (!holdDurationOptions.includes(selectedDurationSec.value)) {
  selectedDurationSec.value = defaultDurationSec
}

const selectedRounds = useLocalStorage(
  'syng.singToneRounds',
  DEFAULT_TOTAL_ROUNDS,
)
if (!ROUNDS_OPTIONS.includes(selectedRounds.value)) {
  selectedRounds.value = DEFAULT_TOTAL_ROUNDS
}

const selectedRangeIndex = useVoiceRangeIndex('syng.singToneRangeIndex')

const game = useSingTone()
</script>

<template>
  <SingToneDisplay
    :game="game"
    v-model:durationSec="selectedDurationSec"
    v-model:rangeIndex="selectedRangeIndex"
    v-model:totalRounds="selectedRounds"
  />
</template>
