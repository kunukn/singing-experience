<script setup lang="ts">
import { DIFFICULTY_OPTIONS, type Difficulty } from '@/constants/difficulty'
import { useLocalStorage } from '@vueuse/core'
import type { CircleDirection, CircleMode, CircleView } from './circleOfFifths'
import { CIRCLE_DIRECTIONS, CIRCLE_MODES, CIRCLE_VIEWS } from './circleOfFifths'
import CircleOfFifthsDisplay from './CircleOfFifthsDisplay.vue'
import {
  DEFAULT_DIFFICULTY,
  DEFAULT_DIRECTION,
  DEFAULT_HOLD_DURATION_MS,
  HOLD_DURATION_OPTIONS,
  useCircleOfFifthsGame,
} from './useCircleOfFifthsGame'

const selectedMode = useLocalStorage<CircleMode>(
  'syng.circleOfFifthsMode',
  'walk',
)
if (!CIRCLE_MODES.includes(selectedMode.value)) selectedMode.value = 'walk'

const selectedDirection = useLocalStorage<CircleDirection>(
  'syng.circleOfFifthsDirection',
  DEFAULT_DIRECTION,
)
if (!CIRCLE_DIRECTIONS.includes(selectedDirection.value)) {
  selectedDirection.value = DEFAULT_DIRECTION
}

const selectedView = useLocalStorage<CircleView>(
  'syng.circleOfFifthsView',
  'fifths',
)
if (!CIRCLE_VIEWS.includes(selectedView.value)) selectedView.value = 'fifths'

const selectedDifficulty = useLocalStorage<Difficulty>(
  'syng.circleOfFifthsDifficulty',
  DEFAULT_DIFFICULTY,
)
if (!DIFFICULTY_OPTIONS.includes(selectedDifficulty.value)) {
  selectedDifficulty.value = DEFAULT_DIFFICULTY
}

const defaultHoldDurationSec = DEFAULT_HOLD_DURATION_MS / 1000

const selectedHoldDurationSec = useLocalStorage(
  'syng.circleOfFifthsHoldDurationSec',
  defaultHoldDurationSec,
)
if (!HOLD_DURATION_OPTIONS.includes(selectedHoldDurationSec.value as never)) {
  selectedHoldDurationSec.value = defaultHoldDurationSec
}

const selectedRangeIndex = useVoiceRangeIndex('syng.rangeIndex')

const game = useCircleOfFifthsGame()
</script>

<template>
  <CircleOfFifthsDisplay
    :game="game"
    v-model:mode="selectedMode"
    v-model:direction="selectedDirection"
    v-model:view="selectedView"
    v-model:difficulty="selectedDifficulty"
    v-model:holdDurationSec="selectedHoldDurationSec"
    v-model:rangeIndex="selectedRangeIndex"
  />
</template>
