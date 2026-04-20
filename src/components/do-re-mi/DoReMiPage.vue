<script setup lang="ts">
import type { ScaleMode } from '@/utils/noteUtils'
import { useLocalStorage } from '@vueuse/core'
import DoReMiDisplay from './DoReMiDisplay.vue'
import {
  DEFAULT_HOLD_DURATION_MS,
  DEFAULT_SCALE_MODE,
  DEFAULT_STARTING_SEMITONE_OFFSET,
  START_TONE_OPTIONS,
  useDoReMiGame,
} from './useDoReMiGame'

const holdDurationOptions = [0.1, 0.3, 0.5, 1, 2, 3, 4, 5, 6, 7, 10]
const VALID_SCALE_MODES: ScaleMode[] = [
  'ionian',
  'dorian',
  'phrygian',
  'lydian',
  'mixolydian',
  'aeolian',
  'locrian',
]

const defaultDurationSec = DEFAULT_HOLD_DURATION_MS / 1000
const selectedDurationSec = useLocalStorage(
  'singing.durationSec',
  defaultDurationSec,
)
if (!holdDurationOptions.includes(selectedDurationSec.value)) {
  selectedDurationSec.value = defaultDurationSec
}

const { toneMode: selectedToneMode } = useToneModeStore()

const selectedStartOffset = useLocalStorage(
  'singing.startOffset',
  DEFAULT_STARTING_SEMITONE_OFFSET,
)
if (
  typeof selectedStartOffset.value !== 'number' ||
  !Number.isInteger(selectedStartOffset.value) ||
  !START_TONE_OPTIONS.some((o) => o.offset === selectedStartOffset.value)
) {
  selectedStartOffset.value = DEFAULT_STARTING_SEMITONE_OFFSET
}

const selectedScaleMode = useLocalStorage<ScaleMode>(
  'singing.scaleMode',
  DEFAULT_SCALE_MODE,
)
if (!VALID_SCALE_MODES.includes(selectedScaleMode.value)) {
  selectedScaleMode.value = DEFAULT_SCALE_MODE
}

const game = useDoReMiGame()
</script>

<template>
  <DoReMiDisplay
    :game="game"
    v-model:durationSec="selectedDurationSec"
    v-model:startOffset="selectedStartOffset"
    v-model:scaleMode="selectedScaleMode"
    v-model:toneMode="selectedToneMode"
  />
</template>
