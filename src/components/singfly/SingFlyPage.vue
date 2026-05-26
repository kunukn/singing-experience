<script setup lang="ts">
import { SINGFLY_CLARITY_THRESHOLD } from './singFlyConstants'
import SingFlyDisplay from './SingFlyDisplay.vue'
import { useSingFlySettings } from './useSingFlySettings'

const { rangeIndex, gameDurationSec, difficulty } = useSingFlySettings()

/* A far more forgiving clarity gate than the 0.9 scoring-game default —
 * SingFly is a continuous tone→height game, so soft/breathy singing should
 * still fly the bird. It is NOT 0, though: an ungated detector lets breath /
 * room tone read as an in-range note and dive the bird into a wall (an
 * accidental death the player never sang). See SINGFLY_CLARITY_THRESHOLD. */
const detection = usePitchDetection({
  clarityThreshold: SINGFLY_CLARITY_THRESHOLD,
})

/* ?debug=1 swaps the mic for the on-screen cheat tone buttons (mic-free).
 * Without it the game plays normally. */
const route = useRoute()
const cheatButtons = computed(() => route.query.debug === '1')
</script>

<template>
  <SingFlyDisplay
    :key="cheatButtons ? 'cheat' : 'mic'"
    :detection="detection"
    :cheatButtons="cheatButtons"
    v-model:rangeIndex="rangeIndex"
    v-model:gameDurationSec="gameDurationSec"
    v-model:difficulty="difficulty"
  />
</template>
