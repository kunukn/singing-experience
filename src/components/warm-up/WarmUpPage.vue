<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core'
import { DEFAULT_RANGE_INDEX } from '@/constants/voiceRanges'
import WarmUpDisplay from './WarmUpDisplay.vue'
import {
  DEFAULT_HOLD_DURATION_MS,
  DEFAULT_PATTERN,
  DEFAULT_SEMITONE_STEP,
  DEFAULT_SEQUENCE_COUNT,
  HOLD_DURATION_OPTIONS,
  SEMITONE_STEP_OPTIONS,
  SEQUENCE_COUNT_OPTIONS,
  useWarmUpGame,
  WARM_UP_PATTERNS,
  WARM_UP_VOICE_RANGE_INDICES,
  type WarmUpPatternId,
} from './useWarmUpGame'

const VALID_PATTERN_IDS = WARM_UP_PATTERNS.map((p) => p.id)

const defaultDurationSec = DEFAULT_HOLD_DURATION_MS / 1000

const selectedDurationSec = useLocalStorage(
  'syng.warmup.durationSec',
  defaultDurationSec,
)
if (!HOLD_DURATION_OPTIONS.includes(selectedDurationSec.value as never)) {
  selectedDurationSec.value = defaultDurationSec
}

const selectedRangeIndex = useLocalStorage<number>(
  'syng.warmup.rangeIndex',
  DEFAULT_RANGE_INDEX,
)
if (
  !Number.isInteger(selectedRangeIndex.value) ||
  !WARM_UP_VOICE_RANGE_INDICES.includes(selectedRangeIndex.value)
) {
  selectedRangeIndex.value = DEFAULT_RANGE_INDEX
}

const selectedSequenceCount = useLocalStorage<number>(
  'syng.warmup.sequenceCount',
  DEFAULT_SEQUENCE_COUNT,
)
if (!SEQUENCE_COUNT_OPTIONS.includes(selectedSequenceCount.value as never)) {
  selectedSequenceCount.value = DEFAULT_SEQUENCE_COUNT
}

const selectedSemitoneStep = useLocalStorage<number>(
  'syng.warmup.semitoneStep',
  DEFAULT_SEMITONE_STEP,
)
if (!SEMITONE_STEP_OPTIONS.includes(selectedSemitoneStep.value as never)) {
  selectedSemitoneStep.value = DEFAULT_SEMITONE_STEP
}

const selectedPatternId = useLocalStorage<WarmUpPatternId>(
  'syng.warmup.patternId',
  DEFAULT_PATTERN,
)
if (!VALID_PATTERN_IDS.includes(selectedPatternId.value)) {
  selectedPatternId.value = DEFAULT_PATTERN
}

const game = useWarmUpGame()
</script>

<template>
  <WarmUpDisplay
    :game="game"
    v-model:durationSec="selectedDurationSec"
    v-model:rangeIndex="selectedRangeIndex"
    v-model:sequenceCount="selectedSequenceCount"
    v-model:semitoneStep="selectedSemitoneStep"
    v-model:patternId="selectedPatternId"
  />
</template>
