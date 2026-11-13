<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core'
import { VOICE_RANGES } from '@/constants/voiceRanges'
import { C3_MIDI } from '@/utils/noteUtils'
import WarmUpDisplay from './WarmUpDisplay.vue'
import {
  DEFAULT_HOLD_DURATION_MS,
  DEFAULT_PATTERN,
  DEFAULT_SEMITONE_STEP,
  DEFAULT_SEQUENCE_COUNT,
  DEFAULT_START_OFFSET,
  HOLD_DURATION_OPTIONS,
  SEMITONE_STEP_OPTIONS,
  SEQUENCE_COUNT_OPTIONS,
  useWarmUpGame,
  WARM_UP_HIGHEST_START_OFFSET,
  WARM_UP_LOWEST_START_OFFSET,
  WARM_UP_PATTERNS,
  WARM_UP_START_TONE_OPTIONS,
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

/* Warm-up used to start on the lowest note of the shared voice range. Seed the
 * start tone from that range so the first note stays where the singer left it.
 * VueUse writes this default on first read, so later range changes never move
 * it. The full range was never offered here — it falls back to the default. */
const sharedRange = VOICE_RANGES[useVoiceRangeIndex('syng.rangeIndex').value]
const seedStartOffset =
  sharedRange.labelKey === 'voiceRanges.full'
    ? DEFAULT_START_OFFSET
    : Math.min(
        WARM_UP_HIGHEST_START_OFFSET,
        Math.max(WARM_UP_LOWEST_START_OFFSET, sharedRange.midiMin - C3_MIDI),
      )

const selectedStartOffset = useLocalStorage<number>(
  'syng.warmup.startOffset',
  seedStartOffset,
)
if (
  !WARM_UP_START_TONE_OPTIONS.some(
    (option) => option.offset === selectedStartOffset.value,
  )
) {
  selectedStartOffset.value = DEFAULT_START_OFFSET
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
    v-model:startOffset="selectedStartOffset"
    v-model:sequenceCount="selectedSequenceCount"
    v-model:semitoneStep="selectedSemitoneStep"
    v-model:patternId="selectedPatternId"
  />
</template>
