<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core'
import PitchGameDisplay from './PitchGameDisplay.vue'
import {
  GAME_DURATION_OPTIONS,
  HOLD_DURATION_OPTIONS,
  type GameDurationSec,
  type HoldDurationSec,
} from './pitchGameOptions'

const selectedRangeIndex = useVoiceRangeIndex('syng.rangeIndex')

const holdDurationSec = useLocalStorage<number>(
  'syng.pitchGameHoldDurationSec',
  0.1,
)
if (!HOLD_DURATION_OPTIONS.includes(holdDurationSec.value as HoldDurationSec)) {
  holdDurationSec.value = 0.1
}

const gameDurationSec = useLocalStorage<number>('syng.pitchGameDurationSec', 20)
if (!GAME_DURATION_OPTIONS.includes(gameDurationSec.value as GameDurationSec)) {
  gameDurationSec.value = 20
}

/* softRawAudio — NS/AGC off so steady sung notes register, EC kept on because
 * reference tones can play through the speaker while the mic listens (a deaf
 * window masks the overlap). rejectSpikes keeps background-noise frames off
 * the chart; its ~80 ms delay on a new note is small against the 3.75 s a
 * target stays capturable. */
const detection = usePitchDetection({ softRawAudio: true, rejectSpikes: true })
</script>

<template>
  <PitchGameDisplay
    :detection="detection"
    v-model:rangeIndex="selectedRangeIndex"
    v-model:holdDurationSec="holdDurationSec"
    v-model:gameDurationSec="gameDurationSec"
  />
</template>
