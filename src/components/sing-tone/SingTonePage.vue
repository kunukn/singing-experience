<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core'
import {
  DEFAULT_HOLD_DURATION_MS,
  DEFAULT_TOTAL_ROUNDS,
  HOLD_DURATION_OPTIONS,
  useSingTone,
} from './useSingTone'

const ROUNDS_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

const defaultDurationSec = DEFAULT_HOLD_DURATION_MS / 1000
const selectedDurationSec = useLocalStorage(
  'syng.singToneDurationSec',
  defaultDurationSec,
)
if (!HOLD_DURATION_OPTIONS.includes(selectedDurationSec.value)) {
  selectedDurationSec.value = defaultDurationSec
}

const selectedRounds = useLocalStorage(
  'syng.singToneRounds',
  DEFAULT_TOTAL_ROUNDS,
)
if (!ROUNDS_OPTIONS.includes(selectedRounds.value)) {
  selectedRounds.value = DEFAULT_TOTAL_ROUNDS
}

/* Cross-feature key — also used by pitch-game / piano / pitch-detector /
 * singfly / warm-up. Keep the string identical across all of them. */
const selectedRangeIndex = useVoiceRangeIndex('syng.rangeIndex')

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
