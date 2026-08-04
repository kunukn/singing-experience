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

/* softRawAudio — NS/AGC off so steady sung notes register, EC kept on because
 * reference tones can play through the speaker while the mic listens (a deaf
 * window masks the overlap). */
const detection = usePitchDetection({ softRawAudio: true })
</script>

<template>
  <PitchGameDisplay
    :detection="detection"
    v-model:rangeIndex="selectedRangeIndex"
    v-model:holdDurationSec="holdDurationSec"
    v-model:gameDurationSec="gameDurationSec"
  />
</template>
