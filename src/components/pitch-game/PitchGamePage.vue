<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core'
import { DEFAULT_RANGE_INDEX, VOICE_RANGES } from '@/constants/voiceRanges'
import PitchGameDisplay from './PitchGameDisplay.vue'
import {
  GAME_DURATION_OPTIONS,
  HOLD_DURATION_OPTIONS,
  type GameDurationSec,
  type HoldDurationSec,
} from './pitchGameOptions'

const selectedRangeIndex = useLocalStorage(
  'syng.rangeIndex',
  DEFAULT_RANGE_INDEX,
)
if (
  typeof selectedRangeIndex.value !== 'number' ||
  !Number.isInteger(selectedRangeIndex.value) ||
  selectedRangeIndex.value < 0 ||
  selectedRangeIndex.value >= VOICE_RANGES.length
) {
  selectedRangeIndex.value = DEFAULT_RANGE_INDEX
}

const holdDurationSec = useLocalStorage<number>(
  'pitchGame.holdDurationSec',
  0.1,
)
if (!HOLD_DURATION_OPTIONS.includes(holdDurationSec.value as HoldDurationSec)) {
  holdDurationSec.value = 0.1
}

const gameDurationSec = useLocalStorage<number>('pitchGame.gameDurationSec', 20)
if (!GAME_DURATION_OPTIONS.includes(gameDurationSec.value as GameDurationSec)) {
  gameDurationSec.value = 20
}

const detection = usePitchDetection()
</script>

<template>
  <PitchGameDisplay
    :detection="detection"
    v-model:rangeIndex="selectedRangeIndex"
    v-model:holdDurationSec="holdDurationSec"
    v-model:gameDurationSec="gameDurationSec"
  />
</template>
